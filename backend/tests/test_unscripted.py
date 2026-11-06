"""Unscripted: Deep research and Takes modes, their content, grading and stats."""
import os
import sys
import unittest
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace

from werkzeug.security import generate_password_hash


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault('SECRET_KEY', 'test-secret-key')
os.environ.setdefault('PRODUCTION', 'false')
os.environ.setdefault('ALLOWED_ORIGINS', 'http://localhost:3001')
os.environ.setdefault('DATABASE_URL', f"sqlite:///{(BACKEND_DIR / 'test_unscripted.db').as_posix()}")
os.environ.setdefault('ADMIN_PASSWORD_HASH', generate_password_hash('admin-pass-123'))
os.environ.setdefault('ENABLE_EMBEDDED_WORKER', 'false')

import app as app_module  # noqa: E402
from achievements import compute_achievements  # noqa: E402
from analysis_service import (  # noqa: E402
    GRADING_RESPONSE_SCHEMA, build_grading_prompt, generate_docx, grading_response_schema,
    normalise_grading_result,
)
from database import AnalysisJob, PracticePrompt, User, UserPracticeSession, db  # noqa: E402
from user_progress import create_practice_session  # noqa: E402

TRANSCRIPT = {'text': 'I disagree with this take because it ignores the evidence.', 'duration': 150.0, 'words': []}


def reply(content=0.8, accuracy=0.5, delivery=0.4, rebuttal=None):
    result = {
        'scores': {'content': content, 'accuracy': accuracy, 'delivery': delivery, 'total': 9},
        'feedback': {'content': 'c', 'accuracy': 'a', 'delivery': 'd'},
        'sample_response': 'sample',
    }
    if rebuttal is not None:
        result['rebuttal'] = rebuttal
    return result


class GradingModeTests(unittest.TestCase):
    def test_nec_prompt_has_no_mode_text(self):
        prompt = build_grading_prompt('Question 1. Discuss.', TRANSCRIPT)
        self.assertNotIn('Practice mode', prompt)
        self.assertIn('My question is', prompt)
        self.assertNotIn('"rebuttal"', prompt)

    def test_takes_prompt_asks_for_a_rebuttal_of_three_minutes(self):
        prompt = build_grading_prompt('Argue against this take: "Breakfast is overrated."', TRANSCRIPT, mode='takes')
        self.assertIn('argue AGAINST it', prompt)
        self.assertIn('Content must not exceed 0.30', prompt)
        self.assertIn('380-450 words', prompt)
        self.assertIn('"rebuttal": {"stance"', prompt)
        self.assertNotIn('My question is', prompt)

    def test_research_prompt_judges_the_concept(self):
        prompt = build_grading_prompt("Deep research topic: Goodhart's law", TRANSCRIPT, mode='research')
        self.assertIn('Practice mode: Deep research', prompt)
        self.assertIn('explains the concept correctly', prompt)
        self.assertIn('Today I am going to talk about', prompt)

    def test_unknown_mode_grades_like_nec(self):
        self.assertEqual(build_grading_prompt('Q', TRANSCRIPT, mode='nonsense'), build_grading_prompt('Q', TRANSCRIPT))

    def test_only_takes_requires_a_rebuttal_in_the_schema(self):
        self.assertIs(grading_response_schema(None), GRADING_RESPONSE_SCHEMA)
        self.assertIs(grading_response_schema('research'), GRADING_RESPONSE_SCHEMA)
        takes = grading_response_schema('takes')
        self.assertIn('rebuttal', takes['required'])
        self.assertNotIn('rebuttal', GRADING_RESPONSE_SCHEMA['required'])  # the original is not mutated

    def test_a_take_that_was_not_opposed_is_capped(self):
        for stance in ('agreed', 'unclear', 'nonsense'):
            result = normalise_grading_result(reply(rebuttal={'stance': stance, 'summary': 'x'}), mode='takes')
            self.assertEqual(result['scores']['content'], 0.3, stance)
            self.assertEqual(result['scores']['total'], 1.2, stance)
        self.assertEqual(result['rebuttal']['stance'], 'unclear')  # an unknown stance reads as unclear

    def test_an_opposed_take_keeps_its_content_score(self):
        result = normalise_grading_result(reply(rebuttal={'stance': 'opposed', 'summary': 'Strong.'}), mode='takes')
        self.assertEqual(result['scores']['content'], 0.8)
        self.assertEqual(result['rebuttal'], {'stance': 'opposed', 'summary': 'Strong.'})

    def test_no_verdict_means_no_cap(self):
        result = normalise_grading_result(reply(), mode='takes')
        self.assertEqual(result['scores']['content'], 0.8)
        self.assertNotIn('rebuttal', result)

    def test_other_modes_drop_a_stray_rebuttal(self):
        for mode in (None, 'research'):
            result = normalise_grading_result(reply(rebuttal={'stance': 'agreed', 'summary': 'x'}), mode=mode)
            self.assertNotIn('rebuttal', result)
            self.assertEqual(result['scores']['content'], 0.8)

    def test_the_report_names_the_mode_and_the_rebuttal(self):
        from docx import Document
        stream = generate_docx('Argue against this take: "X."', 'transcript',
                               {**reply(), 'rebuttal': {'stance': 'opposed', 'summary': 'Well argued.'}}, mode='takes')
        text = '\n'.join(p.text for p in Document(stream).paragraphs)
        self.assertIn('Practice: Unscripted - Takes', text)
        self.assertIn('You argued against the take. Well argued.', text)


class UnscriptedApiTests(unittest.TestCase):
    def setUp(self):
        app_module.app.config.update(TESTING=True)
        self.client = app_module.app.test_client()
        with app_module.app.app_context():
            db.drop_all()
            db.create_all()

    def tearDown(self):
        with app_module.app.app_context():
            db.session.remove()

    def admin(self):
        with self.client.session_transaction() as session:
            session['admin_authenticated'] = True

    def test_the_list_is_public_active_only_and_filtered_by_kind(self):
        with app_module.app.app_context():
            db.session.add_all([
                PracticePrompt(kind='topic', category='Ideas', text='Goodhart\'s law'),
                PracticePrompt(kind='take', category='Ideas', text='Coming second is better than coming first.'),
                PracticePrompt(kind='take', category='Ideas', text='Hidden take.', active=False),
            ])
            db.session.commit()
        everything = self.client.get('/api/unscripted/prompts').get_json()['prompts']
        self.assertEqual(len(everything), 2)
        takes = self.client.get('/api/unscripted/prompts?kind=take').get_json()['prompts']
        self.assertEqual([p['text'] for p in takes], ['Coming second is better than coming first.'])
        self.assertNotIn('blurb', takes[0])
        # Only an admin may ask for the inactive ones.
        self.assertEqual(len(self.client.get('/api/unscripted/prompts?all=1').get_json()['prompts']), 2)
        self.admin()
        self.assertEqual(len(self.client.get('/api/unscripted/prompts?all=1').get_json()['prompts']), 3)

    def test_only_admins_can_edit_and_input_is_checked(self):
        new = {'kind': 'take', 'category': 'Science & tech', 'text': 'Dark mode is bad for your eyes.'}
        self.assertIn(self.client.post('/api/unscripted/prompts', json=new).status_code, (401, 403))
        self.admin()
        for bad, message in (({**new, 'kind': 'quote'}, 'Kind'), ({**new, 'category': 'Sports'}, 'theme'),
                             ({**new, 'text': '   '}, 'empty'), ({**new, 'text': 'x' * 301}, 'too long'),
                             ({'kind': 'take', 'text': 'No theme'}, 'required')):
            response = self.client.post('/api/unscripted/prompts', json=bad)
            self.assertEqual(response.status_code, 400, bad)
            self.assertIn(message, response.get_json()['error'])
        created = self.client.post('/api/unscripted/prompts', json=new).get_json()['prompt']
        self.assertTrue(created['active'])
        updated = self.client.put(f"/api/unscripted/prompts/{created['id']}", json={'active': False}).get_json()['prompt']
        self.assertFalse(updated['active'])
        self.assertEqual(updated['text'], new['text'])  # untouched fields stay
        self.assertEqual(self.client.delete(f"/api/unscripted/prompts/{created['id']}").status_code, 200)
        self.assertEqual(self.client.delete(f"/api/unscripted/prompts/{created['id']}").status_code, 404)

    def test_the_analyze_route_accepts_the_new_modes(self):
        for source, stored in (('takes', 'takes'), ('research', 'research'), ('made-up', 'analyze')):
            response = self.client.post('/api/analyze', data={
                'topic': 'Argue against this take: "X."', 'source': source,
                'audio': (BytesIO(b'fake-audio'), 'answer.webm'),
            }, content_type='multipart/form-data')
            self.assertEqual(response.status_code, 202, source)
            with app_module.app.app_context():
                job = db.session.get(AnalysisJob, response.get_json()['job']['id'])
                self.assertEqual(job.source, stored)


class StatsSplitTests(unittest.TestCase):
    def setUp(self):
        app_module.app.config.update(TESTING=True)
        with app_module.app.app_context():
            db.drop_all()
            db.create_all()

    def tearDown(self):
        with app_module.app.app_context():
            db.session.remove()

    def test_unscripted_counts_as_practice_but_not_toward_scores(self):
        with app_module.app.app_context():
            user = User(email='s@example.com', username='student', name='Student', password_hash='x')
            db.session.add(user)
            db.session.commit()
            scores = lambda total: {'content': 0.5, 'accuracy': 0.4, 'delivery': 0.3, 'total': total}  # noqa: E731
            create_practice_session(user, 'Question 1. NEC', 't', 300, scores(1.2), source='analyze')
            create_practice_session(user, 'Argue against this take: "X."', 't', 150, scores(1.9), source='takes',
                                    rebuttal={'stance': 'opposed', 'summary': 'Good.'})
            create_practice_session(user, 'Deep research topic: Y', 't', 280, scores(0.4), source='research')
            db.session.commit()

            self.assertEqual(user.stats['practices'], 3)
            self.assertEqual(user.stats['avgScore'], 1.2)
            self.assertEqual(user.stats['bestScore'], 1.2)
            self.assertEqual(len(user.progress), 1)

            take = UserPracticeSession.query.filter_by(source='takes').one()
            self.assertEqual(take.to_dict()['source'], 'takes')
            self.assertEqual(take.grading_result()['rebuttal'], {'stance': 'opposed', 'summary': 'Good.'})

    def test_badges_judge_scores_on_nec_practice_only(self):
        def attempt(source, total):
            from datetime import datetime
            return SimpleNamespace(created_at=datetime(2026, 11, 1), scores={'total': total, 'content': 0.5,
                                   'accuracy': 0.4, 'delivery': 0.3}, prompt_key=f'k{total}', metrics=None, source=source)
        result = {b['key']: b for b in compute_achievements([attempt('analyze', 1.2), attempt('takes', 1.95)])}
        self.assertEqual(result['practices']['value'], 2)
        self.assertEqual(result['best_score']['value'], 1.2)
        self.assertEqual(result['explorer']['value'], 1)


if __name__ == '__main__':
    unittest.main()
