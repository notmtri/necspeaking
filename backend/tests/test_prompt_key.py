import importlib.util
import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import build_prompt_key  # noqa: E402

# Forms of one official question as they actually appear in production.
TERTIARY = (
    'Tertiary education should be accessible exclusively to high school graduates with excellent '
    'or good academic records. To what extent do you agree or disagree with this view?'
)
TOURISM = (
    'Some people think that tourism does harm to local cultures, and therefore should be banned. '
    'Others think otherwise. Discuss both views and give your opinion.'
)


def load_migration(filename):
    path = BACKEND_DIR.parent / 'migrations' / 'versions' / filename
    spec = importlib.util.spec_from_file_location(filename[:-3], path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PromptKeyTests(unittest.TestCase):
    def test_numbering_styles_share_a_key(self):
        variants = [
            f'Question 4. {TERTIARY}',
            f'Question 2: {TERTIARY}',
            f'22. {TERTIARY}',
            f'4) {TERTIARY}',
            TERTIARY,
            f'  question 4 -  {TERTIARY.upper()}  ',
        ]
        self.assertEqual(len({build_prompt_key(v) for v in variants}), 1)

    def test_the_papers_preparation_line_is_ignored(self):
        self.assertEqual(
            build_prompt_key(f'Question 1. {TOURISM}\r\nYou have 5 minutes to prepare for your talk. Good luck!'),
            build_prompt_key(TOURISM),
        )

    def test_different_questions_stay_apart(self):
        self.assertNotEqual(build_prompt_key(TERTIARY), build_prompt_key(TOURISM))

    def test_leading_numbers_that_are_content_survive(self):
        self.assertNotEqual(build_prompt_key('5 reasons to learn a language'),
                            build_prompt_key('reasons to learn a language'))
        self.assertNotEqual(build_prompt_key('2020: a year that changed schools'),
                            build_prompt_key('a year that changed schools'))

    def test_empty_prompts_have_no_key(self):
        for empty in ('', None, '   ', 'Question 3.', 'Good luck!'):
            self.assertEqual(build_prompt_key(empty), '', repr(empty))

    def test_rekey_migration_matches_the_application(self):
        migration = load_migration('e5f6a7b8c9d0_rekey_practice_prompts.py')
        samples = [f'Question 4. {TERTIARY}', f'1. {TOURISM}\nGood luck!', TOURISM, 'Cambria (Body)', '']
        for sample in samples:
            self.assertEqual(migration._prompt_key(sample), build_prompt_key(sample), sample)


if __name__ == '__main__':
    unittest.main()
