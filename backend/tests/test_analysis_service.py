import os
import sys
import unittest
from unittest import mock
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import analysis_service  # noqa: E402
from analysis_service import (  # noqa: E402
    GradingUnavailableError,
    allowed_file,
    grade_speech,
    normalise_grading_result,
    parse_grading_json,
    transcribe_audio,
)


FULL_REPLY = (
    '{"scores": {"content": 0.6, "accuracy": 0.4, "delivery": 0.3, "total": 1.3}, '
    '"feedback": {"content": "c", "accuracy": "a", "delivery": "d"}, '
    '"sample_response": "s"}'
)


class ParseGradingJsonTests(unittest.TestCase):
    def test_strips_markdown_code_fences(self):
        self.assertEqual(parse_grading_json('```json\n{"a": 1}\n```'), {'a': 1})
        self.assertEqual(parse_grading_json('```\n{"a": 2}\n```'), {'a': 2})

    def test_preserves_non_ascii_content(self):
        # The previous implementation stripped every non-ASCII character, which
        # silently mutilated feedback text.
        payload = '{"feedback": "Café naïve señor 你好"}'
        self.assertEqual(parse_grading_json(payload)['feedback'], 'Café naïve señor 你好')

    def test_preserves_paragraph_breaks_in_string_values(self):
        result = parse_grading_json('{"sample_response": "Para one.\n\nPara two."}')
        self.assertEqual(result['sample_response'].count('\n'), 2)

    def test_strips_invisible_and_control_junk(self):
        result = parse_grading_json('{"a": "zero​width\x07bell"}')
        self.assertEqual(result['a'], 'zerowidthbell')

    def test_keeps_curly_quotes_inside_string_values(self):
        """The production failure: 61 of 109 jobs died on exactly this.

        Graders quote the student inside feedback. The old parser rewrote the
        curly quotes to straight ones before parsing, which ended the JSON
        string early and raised "Expecting ',' delimiter".
        """
        reply = '{"feedback": "You said “teamwork is key”, which is vague.", "n": 1}'
        result = parse_grading_json(reply)
        self.assertEqual(result['feedback'], 'You said “teamwork is key”, which is vague.')
        self.assertEqual(result['n'], 1)

    def test_keeps_dashes_and_apostrophes_verbatim(self):
        result = parse_grading_json('{"a": "dash — here, it’s fine"}')
        self.assertEqual(result['a'], 'dash — here, it’s fine')

    def test_still_accepts_curly_quotes_used_as_delimiters(self):
        self.assertEqual(parse_grading_json('{“a”: 1}'), {'a': 1})

    def test_extracts_an_object_wrapped_in_prose(self):
        self.assertEqual(parse_grading_json('Here is the grade:\n{"a": 1}\nHope it helps.'), {'a': 1})

    def test_reports_genuinely_broken_json(self):
        with self.assertRaises(ValueError):
            parse_grading_json('{"a": "unterminated')


class NormaliseGradingResultTests(unittest.TestCase):
    def test_clamps_scores_to_the_rubric_and_recomputes_the_total(self):
        result = normalise_grading_result({
            'scores': {'content': 1.5, 'accuracy': '0.4', 'delivery': -1, 'total': 9},
            'feedback': {'content': 'c', 'accuracy': 'a', 'delivery': 'd'},
            'sample_response': 's',
        })
        self.assertEqual(result['scores'], {'content': 0.9, 'accuracy': 0.4, 'delivery': 0.0, 'total': 1.3})

    def test_fills_missing_feedback_sections(self):
        result = normalise_grading_result({
            'scores': {'content': 0.5, 'accuracy': 0.5, 'delivery': 0.5},
        })
        self.assertEqual(result['feedback'], {'content': '', 'accuracy': '', 'delivery': ''})
        self.assertEqual(result['sample_response'], '')

    def test_rejects_a_reply_without_usable_scores(self):
        for bad in ({}, {'scores': 'high'}, {'scores': {'content': 'n/a', 'accuracy': 0.1, 'delivery': 0.1}}, []):
            with self.assertRaises(ValueError, msg=repr(bad)):
                normalise_grading_result(bad)


class AllowedFileTests(unittest.TestCase):
    def test_accepts_supported_audio_extensions(self):
        for name in ('a.mp3', 'a.wav', 'a.m4a', 'a.webm', 'a.ogg', 'A.MP3'):
            self.assertTrue(allowed_file(name), name)

    def test_rejects_everything_else(self):
        for name in ('a.exe', 'a.txt', 'noextension', 'a.mp3.exe'):
            self.assertFalse(allowed_file(name), name)


class _TranscriptionStubClient:
    """Mimics the real SDK response shape.

    groq's Transcription model declares only `text` but sets extra="allow", so
    word timings arrive as a pydantic extra rather than a declared field. This
    stub reproduces that so the extraction path is actually covered.
    """

    def __init__(self, words=None, fail_verbose=False):
        self.words = words
        self.fail_verbose = fail_verbose
        self.calls = []
        outer = self

        class Transcriptions:
            @staticmethod
            def create(**kwargs):
                outer.calls.append(kwargs)
                if kwargs.get('response_format') == 'verbose_json':
                    if outer.fail_verbose:
                        raise RuntimeError('verbose_json not supported')
                    return _VerboseResponse('hello world', outer.words or [])
                return _PlainResponse('hello world')

        self.audio = type('Audio', (), {'transcriptions': Transcriptions()})()


class _VerboseResponse:
    def __init__(self, text, words):
        self.text = text
        self.words = words


class _PlainResponse:
    def __init__(self, text):
        self.text = text


class TranscribeAudioTests(unittest.TestCase):
    """transcribe_audio must ask for timings and survive their absence."""

    SILENT_WAV = BACKEND_DIR / 'tests' / '_fixture_silence.wav'

    @classmethod
    def setUpClass(cls):
        # 0.5s of silence; get_audio_duration reads it without needing ffmpeg.
        import struct
        import wave
        with wave.open(str(cls.SILENT_WAV), 'wb') as handle:
            handle.setnchannels(1)
            handle.setsampwidth(2)
            handle.setframerate(16000)
            handle.writeframes(struct.pack('<8000h', *([0] * 8000)))

    @classmethod
    def tearDownClass(cls):
        if cls.SILENT_WAV.exists():
            cls.SILENT_WAV.unlink()

    def test_requests_word_level_timestamps(self):
        client = _TranscriptionStubClient(words=[{'word': 'hello', 'start': 0.0, 'end': 0.4}])
        transcribe_audio(client, str(self.SILENT_WAV))

        first = client.calls[0]
        self.assertEqual(first['response_format'], 'verbose_json')
        self.assertIn('word', first['timestamp_granularities'])

    def test_extracts_words_from_the_response(self):
        client = _TranscriptionStubClient(words=[
            {'word': 'hello', 'start': 0.0, 'end': 0.4},
            {'word': 'world', 'start': 0.5, 'end': 0.9},
        ])
        result = transcribe_audio(client, str(self.SILENT_WAV))

        self.assertEqual([w['word'] for w in result['words']], ['hello', 'world'])
        self.assertEqual(result['text'], 'hello world')

    def test_falls_back_to_plain_transcript_when_verbose_is_rejected(self):
        # The analysis must still produce content/accuracy feedback even if the
        # provider will not give timings.
        client = _TranscriptionStubClient(fail_verbose=True)
        result = transcribe_audio(client, str(self.SILENT_WAV))

        self.assertEqual(result['text'], 'hello world')
        self.assertEqual(result['words'], [])
        self.assertEqual(len(client.calls), 2)
        self.assertEqual(client.calls[1]['response_format'], 'json')


class _StubGroqClient:
    """Minimal stand-in for the Groq chat completions client.

    Returns the given replies in order (the last one repeats) and records the
    keyword arguments of every call.
    """

    def __init__(self, replies=(FULL_REPLY,)):
        self.replies = list(replies)
        self.calls = []
        outer = self

        def create(**kwargs):
            outer.calls.append(kwargs)
            content = outer.replies[min(len(outer.calls), len(outer.replies)) - 1]
            message = type('Message', (), {'content': content})()
            choice = type('Choice', (), {'message': message})()
            return type('Response', (), {'choices': [choice]})()

        completions = type('Completions', (), {'create': staticmethod(create)})()
        self.chat = type('Chat', (), {'completions': completions})()


class GradeSpeechFallbackTests(unittest.TestCase):
    """The Groq fallback cannot hear the audio, so which grader ran matters."""

    TRANSCRIPT = {'text': 'hello world', 'words': [], 'duration': 10.0}

    def setUp(self):
        # Never make a live Gemini call from the test suite, even when the
        # developer has a real key exported.
        self._saved_key = os.environ.get('GEMINI_API_KEY')
        os.environ['GEMINI_API_KEY'] = ''

    def tearDown(self):
        if self._saved_key is None:
            os.environ.pop('GEMINI_API_KEY', None)
        else:
            os.environ['GEMINI_API_KEY'] = self._saved_key

    def test_records_groq_fallback_when_gemini_is_unavailable(self):
        result = grade_speech(_StubGroqClient(), 'A topic', self.TRANSCRIPT, '')
        self.assertEqual(result['grader'], 'groq-fallback')
        self.assertFalse(result['audio_reviewed'])

    def test_asks_groq_for_json_mode(self):
        client = _StubGroqClient()
        grade_speech(client, 'A topic', self.TRANSCRIPT, '')
        self.assertEqual(client.calls[0]['response_format'], {'type': 'json_object'})

    def test_regenerates_once_when_groq_reply_does_not_parse(self):
        client = _StubGroqClient(replies=['{"scores": {"content": 0.5, "acc', FULL_REPLY])
        result = grade_speech(client, 'A topic', self.TRANSCRIPT, '')
        self.assertEqual(len(client.calls), 2)
        self.assertEqual(result['scores']['total'], 1.3)

    def test_gives_up_cleanly_when_groq_never_parses(self):
        client = _StubGroqClient(replies=['not json at all'])
        with self.assertRaises(GradingUnavailableError):
            grade_speech(client, 'A topic', self.TRANSCRIPT, '')
        self.assertEqual(len(client.calls), analysis_service.GROQ_GRADING_ATTEMPTS)

    def test_raises_a_clear_error_when_no_grader_is_configured(self):
        with self.assertRaises(GradingUnavailableError):
            grade_speech(None, 'A topic', self.TRANSCRIPT, '')


class GeminiRetryTests(unittest.TestCase):
    """503s are common on flash models under load.

    Without a retry a momentary spike silently downgrades the student to
    transcript-only grading -- the exact silent failure this path was fixed to
    stop hiding. These use fake responses so CI never makes a live call.
    """

    VALID_BODY = {
        'candidates': [{'content': {'parts': [{'text': FULL_REPLY}]}}]
    }
    TRANSCRIPT = {'text': 'hello world', 'words': [], 'duration': 10.0}

    def setUp(self):
        self._saved = os.environ.get('GEMINI_API_KEY')
        os.environ['GEMINI_API_KEY'] = 'test-key'

    def tearDown(self):
        if self._saved is None:
            os.environ.pop('GEMINI_API_KEY', None)
        else:
            os.environ['GEMINI_API_KEY'] = self._saved

    def _client_returning(self, statuses):
        """httpx.Client stub yielding the given statuses in order."""
        responses = []
        for status in statuses:
            response = mock.Mock()
            response.status_code = status
            response.text = '{"error": "stub"}'
            response.json.return_value = self.VALID_BODY
            responses.append(response)

        client = mock.MagicMock()
        client.__enter__.return_value = client
        client.post.side_effect = responses
        return client

    def test_retries_a_503_and_then_succeeds(self):
        import analysis_service

        client = self._client_returning([503, 200])
        with mock.patch.object(analysis_service.httpx, 'Client', return_value=client),              mock.patch.object(analysis_service.time, 'sleep') as sleep:
            result = analysis_service.grade_speech_with_gemini('topic', self.TRANSCRIPT, '')

        self.assertEqual(result['scores']['total'], 1.3)
        self.assertEqual(client.post.call_count, 2)
        sleep.assert_called_once()

    def test_gives_up_after_the_attempt_limit(self):
        import analysis_service

        attempts = analysis_service.GEMINI_MAX_ATTEMPTS
        client = self._client_returning([503] * attempts)
        with mock.patch.object(analysis_service.httpx, 'Client', return_value=client),              mock.patch.object(analysis_service.time, 'sleep'):
            with self.assertRaises(RuntimeError) as caught:
                analysis_service.grade_speech_with_gemini('topic', self.TRANSCRIPT, '')

        self.assertIn('503', str(caught.exception))
        self.assertEqual(client.post.call_count, attempts)

    def test_does_not_retry_a_bad_request(self):
        # A 400 means our payload is wrong; retrying just wastes time.
        import analysis_service

        client = self._client_returning([400])
        with mock.patch.object(analysis_service.httpx, 'Client', return_value=client),              mock.patch.object(analysis_service.time, 'sleep') as sleep:
            with self.assertRaises(RuntimeError):
                analysis_service.grade_speech_with_gemini('topic', self.TRANSCRIPT, '')

        self.assertEqual(client.post.call_count, 1)
        sleep.assert_not_called()

    def test_sends_the_documented_generation_config_fields(self):
        """Guards the original bug: responseFormat was not a real field."""
        import analysis_service

        client = self._client_returning([200])
        with mock.patch.object(analysis_service.httpx, 'Client', return_value=client):
            analysis_service.grade_speech_with_gemini('topic', self.TRANSCRIPT, '')

        config = client.post.call_args.kwargs['json']['generationConfig']
        self.assertEqual(config['responseMimeType'], 'application/json')
        self.assertIn('responseSchema', config)
        self.assertNotIn('responseFormat', config)


class GeminiModelChainTests(unittest.TestCase):
    """Flash models return 503 "high demand" for minutes at a time, and not all
    at once. A second Gemini model keeps the audio in the grade instead of
    dropping straight to transcript-only Groq grading."""

    TRANSCRIPT = {'text': 'hello world', 'words': [], 'duration': 10.0}
    OK_BODY = {'candidates': [{'content': {'parts': [{'text': FULL_REPLY}]}}]}

    def setUp(self):
        self._saved = os.environ.get('GEMINI_API_KEY')
        os.environ['GEMINI_API_KEY'] = 'test-key'
        patcher = mock.patch.multiple(
            analysis_service,
            GEMINI_GRADING_MODEL='primary-model',
            GEMINI_FALLBACK_MODELS=['second-model', 'primary-model'],
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    def tearDown(self):
        if self._saved is None:
            os.environ.pop('GEMINI_API_KEY', None)
        else:
            os.environ['GEMINI_API_KEY'] = self._saved

    def _client(self, behaviour_by_model):
        """httpx.Client stub whose reply depends on the model in the URL."""
        posted = []

        def post(url, **kwargs):
            model = url.split('/models/')[1].split(':')[0]
            posted.append(model)
            behaviour = behaviour_by_model[model]
            if isinstance(behaviour, Exception):
                raise behaviour
            response = mock.Mock()
            response.status_code = behaviour
            response.text = '{"error": "stub"}'
            response.json.return_value = self.OK_BODY
            return response

        client = mock.MagicMock()
        client.__enter__.return_value = client
        client.post.side_effect = post
        return client, posted

    def test_chain_is_deduplicated_and_starts_with_the_primary(self):
        self.assertEqual(analysis_service.gemini_model_chain(), ['primary-model', 'second-model'])

    def test_moves_to_the_next_model_when_the_primary_stays_overloaded(self):
        client, posted = self._client({'primary-model': 503, 'second-model': 200})
        with mock.patch.object(analysis_service.httpx, 'Client', return_value=client), \
                mock.patch.object(analysis_service.time, 'sleep'):
            result = grade_speech(_StubGroqClient(), 'topic', self.TRANSCRIPT, '')

        self.assertEqual(result['grader'], 'gemini')
        self.assertEqual(result['grader_model'], 'second-model')
        self.assertEqual(posted.count('primary-model'), analysis_service.GEMINI_MAX_ATTEMPTS)

    def test_a_timeout_moves_on_without_retrying_the_same_model(self):
        import httpx
        client, posted = self._client({
            'primary-model': httpx.ReadTimeout('slow'),
            'second-model': 200,
        })
        with mock.patch.object(analysis_service.httpx, 'Client', return_value=client), \
                mock.patch.object(analysis_service.time, 'sleep'):
            result = grade_speech(_StubGroqClient(), 'topic', self.TRANSCRIPT, '')

        self.assertEqual(posted, ['primary-model', 'second-model'])
        self.assertEqual(result['grader_model'], 'second-model')

    def test_falls_back_to_groq_only_after_every_gemini_model_fails(self):
        client, posted = self._client({'primary-model': 400, 'second-model': 400})
        with mock.patch.object(analysis_service.httpx, 'Client', return_value=client), \
                mock.patch.object(analysis_service.time, 'sleep'):
            result = grade_speech(_StubGroqClient(), 'topic', self.TRANSCRIPT, '')

        self.assertEqual(posted, ['primary-model', 'second-model'])
        self.assertEqual(result['grader'], 'groq-fallback')


if __name__ == '__main__':
    unittest.main()
