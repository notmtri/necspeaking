import os
import threading
import time
from datetime import datetime, timedelta

import cloudinary.uploader

from analysis_service import convert_to_wav, generate_docx, get_audio_duration, grade_speech, transcribe_audio
from database import AnalysisJob, User, db
from user_progress import create_practice_session


class AnalysisWorker:
    def __init__(self, app, groq_client_factory, upload_folder):
        self.app = app
        self.groq_client_factory = groq_client_factory
        self.upload_folder = upload_folder
        self.worker_id = f"worker-{os.getpid()}-{id(self)}"
        self.poll_interval = float(os.getenv('ANALYSIS_JOB_POLL_INTERVAL_SECONDS', '2'))
        self.thread = None
        self.stop_event = threading.Event()
        self.retention_hours = int(os.getenv('ANALYSIS_JOB_RETENTION_HOURS', '72'))
        self.last_cleanup_at = None

    def start(self):
        if self.thread and self.thread.is_alive():
            return
        self.thread = threading.Thread(target=self.run_loop, name='analysis-job-worker', daemon=True)
        self.thread.start()
        print("[JOBS] Embedded analysis worker started.")

    def stop(self):
        self.stop_event.set()

    def run_loop(self):
        while not self.stop_event.is_set():
            try:
                self.cleanup_expired_jobs()
                processed = self.process_next_job()
                if not processed:
                    time.sleep(self.poll_interval)
            except Exception as error:
                print(f"[JOBS] Worker loop error: {error}")
                time.sleep(self.poll_interval)

    def process_next_job(self):
        with self.app.app_context():
            candidate = AnalysisJob.query.filter_by(status='pending').order_by(AnalysisJob.created_at.asc()).first()
            if candidate is None:
                return False

            claimed = AnalysisJob.query.filter_by(id=candidate.id, status='pending').update({
                AnalysisJob.status: 'processing',
                AnalysisJob.progress_message: 'Processing audio.',
                AnalysisJob.started_at: datetime.utcnow(),
            }, synchronize_session=False)
            db.session.commit()

            if claimed != 1:
                return True

            self.process_job(candidate.id)
            return True

    def process_job(self, job_id):
        with self.app.app_context():
            job = db.session.get(AnalysisJob, job_id)
            if not job:
                return

            filepath = job.stored_audio_path
            wav_filepath = ''

            try:
                client = self.groq_client_factory()

                duration = get_audio_duration(filepath)
                if duration > 320:
                    raise ValueError("Audio file exceeds 5 minute limit.")

                wav_filepath = filepath.rsplit('.', 1)[0] + '_compressed.wav'
                convert_to_wav(filepath, wav_filepath)
                if filepath != wav_filepath and os.path.exists(filepath):
                    os.remove(filepath)
                filepath = wav_filepath

                file_size_mb = os.path.getsize(filepath) / (1024 * 1024)
                if file_size_mb > 20:
                    raise ValueError("Audio file too large.")

                job.progress_message = 'Transcribing audio.'
                db.session.commit()
                transcript_data = transcribe_audio(client, filepath)

                job.progress_message = 'Grading speech.'
                db.session.commit()
                grading_result = grade_speech(client, job.topic, transcript_data, filepath)

                job.progress_message = 'Generating report.'
                db.session.commit()
                doc_stream = generate_docx(job.topic, transcript_data["text"], grading_result)

                refreshed_user = None
                if job.user_id:
                    current_user = db.session.get(User, job.user_id)
                    if current_user:
                        create_practice_session(
                            current_user,
                            job.topic,
                            transcript_data["text"],
                            transcript_data["duration"],
                            grading_result["scores"]
                        )
                        db.session.commit()
                        refreshed_user = current_user.to_dict()

                jobs_folder = os.path.join(self.upload_folder, 'jobs')
                os.makedirs(jobs_folder, exist_ok=True)
                doc_filename = f"{job.id}.docx"
                doc_path = os.path.join(jobs_folder, doc_filename)
                with open(doc_path, 'wb') as output_file:
                    output_file.write(doc_stream.getvalue())
                document_external_url = ''
                if self.cloudinary_report_upload_enabled():
                    upload_result = cloudinary.uploader.upload(
                        doc_path,
                        resource_type='raw',
                        folder='necs_reports',
                        public_id=f"report_{job.id}",
                        overwrite=True,
                    )
                    document_external_url = upload_result.get('secure_url') or ''
                    if os.path.exists(doc_path):
                        os.remove(doc_path)

                job.document_path = doc_path if not document_external_url else ''
                job.result_payload = {
                    "transcript": transcript_data["text"],
                    "duration": transcript_data["duration"],
                    "scores": grading_result["scores"],
                    "feedback": grading_result["feedback"],
                    "sample_response": grading_result["sample_response"],
                    "document_filename": f"necs_feedback_{job.id}.docx",
                    "document_url": f"/api/analyze/jobs/{job.id}/document",
                    "document_external_url": document_external_url,
                    "user": refreshed_user,
                }
                job.status = 'completed'
                job.progress_message = 'Completed.'
                job.completed_at = datetime.utcnow()
                db.session.commit()
            except Exception as error:
                db.session.rollback()
                job = db.session.get(AnalysisJob, job_id)
                if job:
                    job.status = 'failed'
                    job.error_message = str(error)
                    job.progress_message = 'Processing failed.'
                    job.completed_at = datetime.utcnow()
                    db.session.commit()
                print(f"[JOBS] Failed job {job_id}: {error}")
            finally:
                for candidate_path in {filepath, wav_filepath, job.stored_audio_path if job else ''}:
                    if candidate_path and os.path.exists(candidate_path):
                        try:
                            os.remove(candidate_path)
                        except OSError:
                            pass

    def cloudinary_report_upload_enabled(self):
        return all([
            os.getenv('CLOUDINARY_CLOUD_NAME', '').strip(),
            os.getenv('CLOUDINARY_API_KEY', '').strip(),
            os.getenv('CLOUDINARY_API_SECRET', '').strip(),
        ])

    def cleanup_expired_jobs(self):
        now = datetime.utcnow()
        if self.last_cleanup_at and (now - self.last_cleanup_at) < timedelta(minutes=10):
            return
        self.last_cleanup_at = now

        with self.app.app_context():
            cutoff = now - timedelta(hours=self.retention_hours)
            expired_jobs = AnalysisJob.query.filter(
                AnalysisJob.completed_at.isnot(None),
                AnalysisJob.completed_at < cutoff,
            ).all()

            for job in expired_jobs:
                local_path = job.document_path or ''
                external_url = (job.result_payload or {}).get('document_external_url') or ''
                if local_path and os.path.exists(local_path):
                    try:
                        os.remove(local_path)
                    except OSError:
                        pass
                if external_url:
                    public_id = f"necs_reports/report_{job.id}"
                    try:
                        cloudinary.uploader.destroy(public_id, resource_type='raw')
                    except Exception as error:
                        print(f"[JOBS] Report cleanup warning for {job.id}: {error}")
                db.session.delete(job)
            if expired_jobs:
                db.session.commit()


def should_start_embedded_worker():
    value = os.getenv('ENABLE_EMBEDDED_WORKER', '').strip().lower()
    if value in {'1', 'true', 'yes'}:
        return True
    if value in {'0', 'false', 'no'}:
        return False
    production = os.getenv('PRODUCTION', '').strip().lower() == 'true'
    return not production
