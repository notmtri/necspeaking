import os
import sys
import unittest
from unittest import mock
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from analysis_service import allowed_file, grade_speech, parse_grading_json, transcribe_audio  # noqa: E402


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

    def test_normalises_smart_punctuation(self):
        result = parse_grading_json('{"a": "dash — here"}')
        self.assertEqual(result['a'], 'dash - here')


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
    """Minimal stand-in for the Groq chat completions client."""

    RESPONSE_JSON = '{"scores": {"total": 1.0}, "feedback": {}, "sample_response": ""}'

    def __init__(self):
        message = type('Message', (), {'content': self.RESPONSE_JSON})()
        choice = type('Choice', (), {'message': message})()
        response = type('Response', (), {'choices': [choice]})()
        completions = type('Completions', (), {
            'create': staticmethod(lambda **kwargs: response),
        })()
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


if __name__ == '__main__':
    unittest.main()


class GeminiRetryTests(unittest.TestCase):
    """503s are common on flash models under load.

    Without a retry a momentary spike silently downgrades the student to
    transcript-only grading -- the exact silent failure this path was fixed to
    stop hiding. These use fake responses so CI never makes a live call.
    """

    VALID_BODY = {
        'candidates': [{'content': {'parts': [{'text': '{"scores": {"total": 1.5}, '
                                                      '"feedback": {}, "sample_response": ""}'}]}}]
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

        self.assertEqual(result['scores']['total'], 1.5)
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
