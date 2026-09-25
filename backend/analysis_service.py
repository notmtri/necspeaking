import base64
import io
import json
import mimetypes
import os
import re
import time
from datetime import datetime

import httpx
from pydub import AudioSegment
from werkzeug.utils import secure_filename

from speech_metrics import build_speech_metrics, describe_metrics_for_prompt, normalise_words


ALLOWED_EXTENSIONS = {'wav', 'mp3', 'm4a', 'webm', 'ogg'}
TRANSCRIPTION_MODEL = os.getenv('GROQ_TRANSCRIPTION_MODEL', 'whisper-large-v3')
GEMINI_GRADING_MODEL = os.getenv('GEMINI_GRADING_MODEL', 'gemini-3.5-flash')
# Tried in order when the primary model is overloaded. Flash models return 503
# "high demand" for minutes at a time, and not all of them at once, so a second
# Gemini model keeps the audio in the grade far more often than dropping
# straight to the transcript-only Groq fallback.
GEMINI_FALLBACK_MODELS = [
    model.strip()
    for model in os.getenv('GEMINI_FALLBACK_MODELS', 'gemini-3.6-flash,gemini-3.5-flash-lite').split(',')
    if model.strip()
]
GEMINI_REQUEST_TIMEOUT_SECONDS = float(os.getenv('GEMINI_REQUEST_TIMEOUT_SECONDS', '120'))
GROQ_GRADING_FALLBACK_MODEL = os.getenv('GROQ_GRADING_FALLBACK_MODEL', 'openai/gpt-oss-120b')
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
# Flash models return 503 under load often enough that a single attempt would
# regularly fall back to transcript-only grading.
GEMINI_MAX_ATTEMPTS = int(os.getenv('GEMINI_MAX_ATTEMPTS', '3'))
GEMINI_RETRY_BACKOFF_SECONDS = float(os.getenv('GEMINI_RETRY_BACKOFF_SECONDS', '1.5'))
GEMINI_RETRYABLE_STATUSES = {429, 500, 502, 503, 504}


GRADING_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "scores": {
            "type": "object",
            "properties": {
                "content": {"type": "number"},
                "accuracy": {"type": "number"},
                "delivery": {"type": "number"},
                "total": {"type": "number"},
            },
            "required": ["content", "accuracy", "delivery", "total"],
        },
        "feedback": {
            "type": "object",
            "properties": {
                "content": {"type": "string"},
                "accuracy": {"type": "string"},
                "delivery": {"type": "string"},
            },
            "required": ["content", "accuracy", "delivery"],
        },
        "sample_response": {"type": "string"},
    },
    "required": ["scores", "feedback", "sample_response"],
}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def cleanup_old_files(upload_folder):
    try:
        current_time = datetime.now().timestamp()
        for filename in os.listdir(upload_folder):
            filepath = os.path.join(upload_folder, filename)
            if filename in ['samples', 'simulations', 'questions.json', 'metadata.json', 'jobs']:
                continue
            if os.path.isfile(filepath):
                file_age = current_time - os.path.getmtime(filepath)
                if file_age > 3600:
                    os.remove(filepath)
    except Exception as error:
        print(f"Cleanup error: {error}")


def get_audio_duration(file_path):
    audio = AudioSegment.from_file(file_path)
    return len(audio) / 1000.0


def convert_to_wav(input_path, output_path):
    audio = AudioSegment.from_file(input_path)
    audio = audio.set_frame_rate(16000).set_channels(1)
    audio.export(output_path, format="wav")
    return output_path


def transcribe_audio(groq_client, file_path):
    """Transcribe with word-level timings.

    verbose_json + word granularity is what makes the delivery metrics
    possible. If the provider rejects those options we fall back to a plain
    transcript rather than failing the whole analysis -- the student still gets
    content and accuracy feedback, just without timing evidence.
    """
    with open(file_path, 'rb') as audio_file:
        audio_bytes = audio_file.read()

    words = []
    try:
        transcription = groq_client.audio.transcriptions.create(
            file=("audio.wav", audio_bytes),
            model=TRANSCRIPTION_MODEL,
            response_format="verbose_json",
            timestamp_granularities=["word", "segment"],
        )
        words = getattr(transcription, 'words', None) or []
        if not words and isinstance(transcription, dict):
            words = transcription.get('words') or []
    except Exception as error:
        print(f"[ANALYSIS] Word-level transcription unavailable, using plain transcript: {error}")
        transcription = groq_client.audio.transcriptions.create(
            file=("audio.wav", audio_bytes),
            model=TRANSCRIPTION_MODEL,
            response_format="json",
        )

    duration = get_audio_duration(file_path)
    transcript_text = transcription.text if hasattr(transcription, 'text') else str(transcription)

    return {
        "text": transcript_text,
        "words": normalise_words(words),
        "duration": duration,
    }


def build_grading_prompt(topic, transcript_data, audio_attached=False):
    transcript_text = transcript_data["text"]
    total_words = len(transcript_text.split())
    duration = transcript_data["duration"]
    words_per_minute = (total_words / duration * 60) if duration > 0 else 0
    metrics = transcript_data.get("metrics") or build_speech_metrics(
        transcript_data.get("words"), duration,
    )
    delivery_evidence = describe_metrics_for_prompt(metrics)
    audio_instruction = (
        "The original speech audio is attached. Use it to evaluate pronunciation, intonation, "
        "pauses, fluency, confidence, and delivery. Use the transcript for content, vocabulary, "
        "grammar, and examples."
        if audio_attached
        else "Only the transcript and timing metrics are available. Do not claim to hear pronunciation directly."
    )

    return f"""You are an expert English speaking examiner. Grade the following speech response based on this rubric:

**Rubric (Total: 2.0 points)**
1. Content (0.9/2.0 points)
   - Sufficiently address all requirements of the test question
   - Develop supporting ideas with relevant reasons and examples
   - Display a range of original and practical ideas

2. Accuracy (0.6/2.0 points)
   - Demonstrate a wide variety of vocabulary and grammatical structures
   - Make correct use of words, grammatical structures and linking devices
   - Demonstrate correct pronunciation with appropriate intonation

3. Delivery (0.5/2.0 points)
   - Maintain fluency throughout
   - Demonstrate effective use of presentation skills

**Topic/Question:** {topic}

**Speech Transcript:** {transcript_text}

**Speech Metrics:**
- Total words: {total_words}
- Duration: {duration:.1f} seconds
- Speaking pace: {words_per_minute:.0f} words/minute

**Measured Delivery Evidence (from word-level timings):**
{delivery_evidence}

Ground the Delivery score in the measured evidence above. Cite specific numbers
(pace, filler count, pauses) rather than describing delivery in general terms.

**Audio Availability:** {audio_instruction}

**Instructions:**
1. Provide scores for each criterion (rounded to 2 decimal places)
2. Give detailed feedback for each criterion with specific examples from the transcript and audio when available
3. Point out both strengths and areas for improvement
4. Generate a comprehensive sample 2.0/2.0 response to the same topic that would take approximately 5 minutes to speak (around 600-750 words). The sample should:
   - Start with "My question is... (if question number is provided), and the prompt is... Here is my response." and then answer the question fully
   - End with "This is the end of my speech. Thank you."
   - Be detailed and well-structured with clear introduction, body paragraphs, and conclusion
   - Include specific examples, explanations, and supporting details
   - Demonstrate sophisticated vocabulary and varied sentence structures
   - Show natural flow with appropriate transitions
   - Be comprehensive enough to fill a 5-minute speaking time
   - Be creative in the introduction to hook the listener's attention
   - Grade at C2 level of the CEFR framework
   - Be very strict

Return only valid JSON matching this shape:
{{
    "scores": {{
        "content": 0.00,
        "accuracy": 0.00,
        "delivery": 0.00,
        "total": 0.00
    }},
    "feedback": {{
        "content": "Detailed feedback with examples...",
        "accuracy": "Detailed feedback with examples...",
        "delivery": "Detailed feedback with examples..."
    }},
    "sample_response": "A complete 2.0/2.0 sample response to the topic..."
}}"""


def _strip_code_fences(result_text):
    if "```json" in result_text:
        return result_text.split("```json")[1].split("```")[0].strip()
    if "```" in result_text:
        return result_text.split("```")[1].split("```")[0].strip()
    return result_text.strip()


def _clean_invisible_characters(result_text):
    # Strip zero-width, bidi and BOM characters; normalise exotic spaces.
    result_text = re.sub(u'[\u200b-\u200f\u202a-\u202e\u2060\ufeff]', '', result_text)
    result_text = re.sub(u'[\u00a0\u202f]', ' ', result_text)
    # Raw control characters are illegal inside JSON strings. Everything else,
    # including non-ASCII letters and accents, is real content and is kept.
    return re.sub(u'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', result_text)


def parse_grading_json(result_text):
    """Parse a grader's JSON reply without corrupting its string values.

    The previous version rewrote curly quotes to straight ones across the whole
    reply *before* parsing. Graders routinely quote the student inside feedback
    -- 'you said \u201cteamwork\u201d' -- and that rewrite turned those into bare
    `"` characters that terminated the JSON string early. Every such reply died
    with "Expecting ',' delimiter"; that was the single largest cause of failed
    analyses in production. The reply is now parsed as-is first, and the
    punctuation rewrite is kept only as a last resort for replies that use
    curly quotes as the JSON delimiters themselves.
    """
    result_text = _clean_invisible_characters(_strip_code_fences(result_text or ''))

    # strict=False permits raw tabs/newlines inside string values. Models often
    # emit them in the multi-paragraph sample_response.
    try:
        return json.loads(result_text, strict=False)
    except json.JSONDecodeError as first_error:
        # Some models wrap the object in prose; take the outermost braces.
        start, end = result_text.find('{'), result_text.rfind('}')
        if start != -1 and end > start:
            try:
                return json.loads(result_text[start:end + 1], strict=False)
            except json.JSONDecodeError:
                pass

        normalised = result_text.replace(u'\u201c', '"').replace(u'\u201d', '"')
        try:
            return json.loads(normalised, strict=False)
        except json.JSONDecodeError:
            raise first_error


SCORE_LIMITS = {"content": 0.9, "accuracy": 0.6, "delivery": 0.5}


def _score(value, upper):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number != number:  # NaN
        return None
    return round(min(max(number, 0.0), upper), 2)


def normalise_grading_result(result):
    """Validate a parsed grading reply and coerce it into the shape we store.

    A reply can be valid JSON and still be unusable: a score as a string, a
    missing feedback section, content scored 1.5 out of 0.9. Those used to
    surface as a KeyError or a nonsense report after the student had already
    waited through grading. Scores are clamped to the rubric and the total is
    recomputed from the parts so it can never disagree with them.
    """
    if not isinstance(result, dict):
        raise ValueError("Grader reply is not a JSON object.")

    raw_scores = result.get("scores")
    if not isinstance(raw_scores, dict):
        raise ValueError("Grader reply has no scores.")

    scores = {}
    for criterion, upper in SCORE_LIMITS.items():
        value = _score(raw_scores.get(criterion), upper)
        if value is None:
            raise ValueError(f"Grader reply has no usable {criterion} score.")
        scores[criterion] = value
    scores["total"] = round(sum(scores[criterion] for criterion in SCORE_LIMITS), 2)

    raw_feedback = result.get("feedback") if isinstance(result.get("feedback"), dict) else {}
    feedback = {
        criterion: str(raw_feedback.get(criterion) or '').strip()
        for criterion in SCORE_LIMITS
    }

    normalised = dict(result)
    normalised["scores"] = scores
    normalised["feedback"] = feedback
    normalised["sample_response"] = str(result.get("sample_response") or '').strip()
    return normalised


def gemini_model_chain():
    chain = []
    for model in [GEMINI_GRADING_MODEL, *GEMINI_FALLBACK_MODELS]:
        if model and model not in chain:
            chain.append(model)
    return chain


def grade_speech_with_gemini(topic, transcript_data, audio_path, model=None):
    model = model or GEMINI_GRADING_MODEL
    gemini_api_key = os.getenv('GEMINI_API_KEY', '').strip()
    if not gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    parts = [{"text": build_grading_prompt(topic, transcript_data, audio_attached=bool(audio_path))}]
    if audio_path:
        if audio_path.lower().endswith('.wav'):
            mime_type = 'audio/wav'
        else:
            mime_type = mimetypes.guess_type(audio_path)[0] or 'audio/wav'
        with open(audio_path, 'rb') as audio_file:
            parts.append({
                "inline_data": {
                    "mime_type": mime_type,
                    "data": base64.b64encode(audio_file.read()).decode('ascii'),
                }
            })

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": 0.2,
            # These are the field names generateContent accepts. The API rejects
            # unknown generationConfig keys outright, so a wrong shape here means
            # every grading call fails and silently degrades to the Groq fallback.
            "responseMimeType": "application/json",
            "responseSchema": GRADING_RESPONSE_SCHEMA,
        },
    }

    url = GEMINI_API_URL.format(model=model)
    data = None
    last_error = ''

    with httpx.Client(timeout=GEMINI_REQUEST_TIMEOUT_SECONDS) as client:
        for attempt in range(GEMINI_MAX_ATTEMPTS):
            try:
                response = client.post(
                    url,
                    headers={
                        "Content-Type": "application/json",
                        "x-goog-api-key": gemini_api_key,
                    },
                    json=payload,
                )
            except httpx.TimeoutException as error:
                # A model that just spent the whole timeout is saturated; a
                # retry would most likely burn another full timeout. Let the
                # caller move on to the next model instead.
                raise RuntimeError(
                    f"Gemini model '{model}' timed out after {GEMINI_REQUEST_TIMEOUT_SECONDS:.0f}s."
                ) from error
            except httpx.RequestError as error:
                last_error = f"connection error: {error}"
                if attempt + 1 < GEMINI_MAX_ATTEMPTS:
                    time.sleep(GEMINI_RETRY_BACKOFF_SECONDS * (2 ** attempt))
                    continue
                raise RuntimeError(f"Gemini grading request failed: {last_error}") from error

            if response.status_code == 200:
                data = response.json()
                break

            last_error = (
                f"HTTP {response.status_code} for model '{model}': "
                f"{response.text[:400]}"
            )

            # 503/429 mean the model is busy, not that the request is wrong.
            # Without a retry a momentary spike silently downgrades the student
            # to transcript-only grading, which is the exact failure this whole
            # code path was fixed to stop hiding.
            if response.status_code in GEMINI_RETRYABLE_STATUSES and attempt + 1 < GEMINI_MAX_ATTEMPTS:
                delay = GEMINI_RETRY_BACKOFF_SECONDS * (2 ** attempt)
                print(f"[ANALYSIS] Gemini {response.status_code}, retrying in {delay:.1f}s "
                      f"(attempt {attempt + 1}/{GEMINI_MAX_ATTEMPTS}).")
                time.sleep(delay)
                continue

            raise RuntimeError(f"Gemini grading request failed with {last_error}")

    if data is None:
        raise RuntimeError(f"Gemini grading request failed with {last_error}")

    candidates = data.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini returned no grading candidate.")

    response_parts = (candidates[0].get("content") or {}).get("parts") or []
    result_text = ''.join(part.get("text", "") for part in response_parts).strip()
    if not result_text:
        raise RuntimeError("Gemini returned an empty grading response.")

    return normalise_grading_result(parse_grading_json(result_text))


GROQ_GRADING_ATTEMPTS = 2


class GradingUnavailableError(RuntimeError):
    """Every grader failed. The job fails with a retry-later message."""


def grade_speech_with_groq(groq_client, topic, transcript_data):
    """Transcript-only grading, used when no Gemini model is reachable.

    JSON mode is requested so the reply is at least meant to be an object, and
    a reply that still will not parse is regenerated once: the fallback runs
    exactly when Gemini is already down, so failing here fails the student.
    """
    prompt = build_grading_prompt(topic, transcript_data, audio_attached=False)
    last_error = None
    for attempt in range(GROQ_GRADING_ATTEMPTS):
        response = groq_client.chat.completions.create(
            model=GROQ_GRADING_FALLBACK_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        try:
            return normalise_grading_result(parse_grading_json(response.choices[0].message.content))
        except ValueError as error:  # JSONDecodeError is a ValueError
            last_error = error
            print(f"[ANALYSIS] Groq returned an unusable grading reply "
                  f"(attempt {attempt + 1}/{GROQ_GRADING_ATTEMPTS}): {error}")
    raise GradingUnavailableError(f"Groq fallback returned no usable grading: {last_error}")


def grade_speech(groq_client, topic, transcript_data, audio_path=''):
    """Grade a response, preferring Gemini because it can hear the audio.

    Each Gemini model in the chain is tried in turn; only when none of them can
    answer does grading fall back to Groq, which sees the transcript alone, so
    Delivery is scored blind there. The chosen grader and model are recorded on
    the result so a permanent fallback cannot go unnoticed.
    """
    gemini_errors = []
    for model in gemini_model_chain():
        try:
            result = grade_speech_with_gemini(topic, transcript_data, audio_path, model=model)
            if gemini_errors:
                print(f"[ANALYSIS] Graded with fallback Gemini model '{model}' after: "
                      f"{' | '.join(gemini_errors)}")
            result['grader'] = 'gemini'
            result['grader_model'] = model
            result['audio_reviewed'] = bool(audio_path)
            return result
        except Exception as error:
            gemini_errors.append(f"{model}: {error}")
            # A missing key fails identically for every model.
            if not os.getenv('GEMINI_API_KEY', '').strip():
                break

    print(
        f"[ANALYSIS] Gemini grading unavailable, falling back to Groq "
        f"(transcript only, delivery scored without audio): {' | '.join(gemini_errors)}"
    )
    if groq_client is None:
        raise GradingUnavailableError("No grader is available: Gemini failed and Groq is not configured.")
    result = grade_speech_with_groq(groq_client, topic, transcript_data)
    result['grader'] = 'groq-fallback'
    result['grader_model'] = GROQ_GRADING_FALLBACK_MODEL
    result['audio_reviewed'] = False
    return result


def generate_docx(topic, transcript, grading_result):
    from docx import Document
    from docx.enum.text import WD_ALIGN_PARAGRAPH

    doc = Document()

    title = doc.add_heading('necs. - Speech Feedback Report', 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph(f"Date: {datetime.now().strftime('%B %d, %Y')}")
    doc.add_paragraph(f"Topic: {topic}")
    doc.add_paragraph()

    doc.add_heading('Score Summary', 1)
    scores = grading_result['scores']

    table = doc.add_table(rows=5, cols=2)
    table.style = 'Light Grid Accent 1'

    score_data = [
        ('Content', f"{scores['content']}/0.9"),
        ('Accuracy', f"{scores['accuracy']}/0.6"),
        ('Delivery', f"{scores['delivery']}/0.5"),
        ('', ''),
        ('TOTAL SCORE', f"{scores['total']}/2.0")
    ]

    for index, (criterion, score) in enumerate(score_data):
        table.rows[index].cells[0].text = criterion
        table.rows[index].cells[1].text = score
        if index == 4:
            for cell in table.rows[index].cells:
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs:
                        run.bold = True

    doc.add_paragraph()

    doc.add_heading('Detailed Feedback', 1)
    feedback = grading_result['feedback']

    doc.add_heading('1. Content', 2)
    doc.add_paragraph(feedback['content'])

    doc.add_heading('2. Accuracy', 2)
    doc.add_paragraph(feedback['accuracy'])

    doc.add_heading('3. Delivery', 2)
    doc.add_paragraph(feedback['delivery'])

    doc.add_page_break()

    doc.add_heading('Your Speech Transcript', 1)
    doc.add_paragraph(transcript)

    doc.add_page_break()

    doc.add_heading('Sample 2.0/2.0 Response', 1)
    doc.add_paragraph(grading_result['sample_response'])

    file_stream = io.BytesIO()
    doc.save(file_stream)
    file_stream.seek(0)

    return file_stream


def build_job_storage_path(upload_folder, filename):
    jobs_folder = os.path.join(upload_folder, 'jobs')
    os.makedirs(jobs_folder, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    secured = secure_filename(filename)
    return os.path.join(jobs_folder, f"{timestamp}_{secured}")
