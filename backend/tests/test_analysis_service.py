import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from analysis_service import allowed_file, grade_speech, parse_grading_json  # noqa: E402


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
