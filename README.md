# necs. - AI-Powered NEC Speaking Practice Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://reactjs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000?logo=flask)](https://flask.palletsprojects.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://www.python.org/)

> Master NEC Speaking with AI-powered feedback, realistic simulations, and high-scoring sample speeches.

[Live Demo](https://necspeaking.vercel.app) • [Report Bug](https://forms.gle/rshYXP6niQ7NR3G68) • [Request Feature](https://forms.gle/rshYXP6niQ7NR3G68)

---

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [Demo](#demo)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Acknowledgments](#acknowledgments)

---

## 🎯 About

**necs.** is an AI-powered speech analysis platform designed specifically for students preparing for the NEC Speaking examination. Built by a student at HSGS Le Quy Don for students, it provides instant, detailed feedback on speaking performance using advanced AI technology.

### Why necs.?

- 🚀 **Instant Feedback**: Get detailed analysis in seconds, not days
- 🎯 **Accurate Grading**: AI trained on official NEC rubrics (±0.1 accuracy)
- 📊 **Comprehensive Reports**: Download detailed feedback documents
- 🎤 **Realistic Simulation**: Practice with actual test interface and timing
- 📚 **Sample Library**: Learn from high-scoring speeches (2.0/2.0)
- 🔒 **Secure & Private**: Your data is protected with enterprise-grade security

---

## ✨ Features

### 🎙️ Speech Analysis
- Upload audio files (MP3, WAV, M4A, WEBM, OGG)
- AI-powered transcription using Whisper
- Detailed scoring across 3 criteria:
  - **Content** (0.9 points): Ideas, development, originality
  - **Accuracy** (0.6 points): Grammar, vocabulary, pronunciation
  - **Delivery** (0.5 points): Fluency, presentation skills
- Generate sample 2.0 responses
- Download comprehensive feedback reports (.docx)

### 🎮 Simulation Mode
- Authentic NEC test interface
- 60-second reading time
- 5-minute preparation period
- 5-minute recording session
- Automatic timer management
- Question randomization
- Full analysis after recording

### 📚 Sample Library
- High-scoring speech samples (2.0/2.0)
- Audio playback with controls
- Full transcripts
- Expert feedback explanations
- Search and filter functionality
- Download samples for offline study

### 🔐 Admin Panel
- Secure authentication system
- Upload and manage samples
- Question bank management
- Edit/delete content
- Cloudinary integration for audio storage

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **MediaRecorder API** - Audio recording

### Backend
- **Flask 3.x** - Python web framework
- **PostgreSQL** - Database (via Render)
- **SQLAlchemy** - ORM
- **Groq API** - AI transcription & grading (Whisper + Llama)
- **Cloudinary** - Audio file storage
- **python-docx** - Document generation

### Infrastructure
- **Render** - Hosting (Frontend & Backend)
- **Cloudinary** - CDN for audio files
- **PostgreSQL** - Database hosting

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **PostgreSQL** (or use SQLite for local dev)
- **Groq API Key** (free at [groq.com](https://groq.com))
- **Cloudinary Account** (free tier available)

### Installation

#### 1. Clone the repository

```bash
git clone https://github.com/yourusername/necs.git
cd necs
```

#### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (see Environment Variables section)
cp .env.example .env

# Initialize database
python
>>> from app import app, db
>>> with app.app_context():
...     db.create_all()
>>> exit()

# Run backend
python app.py
```

Backend will run on `http://localhost:5000`

#### 3. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create .env file
echo "REACT_APP_API_URL=http://localhost:5000" > .env

# Run frontend
npm start
```

Frontend will run on `http://localhost:3000`

### Environment Variables

#### Backend `.env`

```env
# Security
SECRET_KEY=your_generated_secret_key_here
ADMIN_PASSWORD_HASH=your_password_hash_here

# Database
DATABASE_URL=postgresql://user:password@localhost/necs

# Groq API
GROQ_API_KEY=your_groq_api_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# CORS (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Production flag
PRODUCTION=false
```

#### Frontend `.env`

```env
REACT_APP_API_URL=http://localhost:5000
```

### Generate Admin Password Hash

```bash
python3 -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('your_password'))"
```

---

## 📖 Usage

### For Students

1. **Analyze Speech**
   - Go to "Analyze" tab
   - Enter your speaking question
   - Upload your audio recording
   - Click "Analyze Speech"
   - Review detailed feedback
   - Download your report

2. **Practice with Simulation**
   - Go to "Simulation" tab
   - Test your microphone
   - Start simulation
   - Read question (60s)
   - Prepare response (5 min)
   - Record response (5 min)
   - Get instant analysis

3. **Learn from Samples**
   - Go to "Samples" tab
   - Browse high-scoring speeches
   - Listen to audio samples
   - Read transcripts
   - Study feedback explanations

### For Admins

1. Access admin panel (Settings icon)
2. Login with admin password
3. Upload new samples or questions
4. Manage existing content
5. View usage statistics (future feature)

---

## 📁 Project Structure

```
necs/
├── frontend/                # React frontend
│   ├── public/
│   │   ├── logo.png
│   │   ├── donation.png
│   │   └── necs_user_manual.pdf
│   ├── src/
│   │   ├── App.js          # Main application component
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js
│
├── backend/                 # Flask backend
│   ├── app.py              # Main Flask application
│   ├── database.py         # Database models
│   ├── requirements.txt    # Python dependencies
│   └── .env                # Environment variables (not in git)
│
├── README.md               # This file
├── LICENSE                 # MIT License
└── .gitignore             # Git ignore rules
```

---

## 🔌 API Documentation

### Authentication

#### Login
```http
POST /api/admin/login
Content-Type: application/json

{
  "password": "your_password"
}
```

#### Logout
```http
POST /api/admin/logout
```

### Speech Analysis

#### Analyze Speech
```http
POST /api/analyze
Content-Type: multipart/form-data

audio: <audio_file>
topic: "Your speaking question"
```

**Response:**
```json
{
  "success": true,
  "transcript": "Your speech text...",
  "scores": {
    "content": 0.85,
    "accuracy": 0.55,
    "delivery": 0.45,
    "total": 1.85
  },
  "feedback": {
    "content": "Detailed feedback...",
    "accuracy": "Detailed feedback...",
    "delivery": "Detailed feedback..."
  },
  "sample_response": "Sample 2.0 response...",
  "document_base64": "base64_encoded_docx"
}
```

### Samples

#### Get All Samples
```http
GET /api/samples
```

#### Upload Sample (Admin Only)
```http
POST /api/samples/upload
Content-Type: multipart/form-data
Credentials: include

audio: <audio_file>
topic: "Sample topic"
speaker: "Speaker name"
score: 2.0
transcript: "Full transcript..."
feedback: "Why this scored high..."
```

### Questions

#### Get Random Question
```http
GET /api/questions/random
```

#### Add Question (Admin Only)
```http
POST /api/questions
Content-Type: application/json
Credentials: include

{
  "topic": "Question source",
  "question": "Question text...",
  "category": "General"
}
```

*Full API documentation available in `/docs` (coming soon)*

---

## 🔒 Security

This project implements multiple security layers:

- ✅ **Password Hashing**: Scrypt algorithm with salt
- ✅ **Session Management**: Secure HTTP-only cookies
- ✅ **CORS Protection**: Whitelist-based origin checking
- ✅ **Rate Limiting**: Prevents abuse (5 login attempts per 5 min)
- ✅ **Input Validation**: Secure filename handling
- ✅ **Admin Authentication**: Required for all sensitive operations
- ✅ **HTTPS Enforcement**: Production mode requires SSL

### Security Best Practices

1. Never commit `.env` files
2. Rotate `SECRET_KEY` regularly in production
3. Use strong admin passwords (12+ characters)
4. Enable HTTPS in production
5. Review logs regularly for suspicious activity
6. Keep dependencies updated

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Test thoroughly before submitting

### Areas for Contribution

- 🐛 Bug fixes
- ✨ New features (see Issues)
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- 🌍 Internationalization
- ♿ Accessibility improvements

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Contact

**Nguyen Hoang Minh Tri** - Developer

- 📧 Email: [nguyenhoangminhtri2k8@gmail.com](mailto:nguyenhoangminhtri2k8@gmail.com)
- 📱 Facebook: [@notmtri](https://facebook.com/notmtri)
- 📺 YouTube: [@therealmtri](https://youtube.com/@therealmtri)
- 📷 Instagram: [@notmtri](https://instagram.com/notmtri)

**necs. Official**

- 📷 Instagram: [@necspeaking](https://instagram.com/necspeaking)
- 📧 Email: [necspeaking@gmail.com](mailto:necspeaking@gmail.com)
- 📝 Feedback: [Google Form](https://forms.gle/rshYXP6niQ7NR3G68)
- 🎤 Sample Contributions: [Google Form](https://forms.gle/SKY6RSRoQXLehJUL6)

**Project Link**: [https://github.com/yourusername/necs](https://github.com/yourusername/necs)

---

## 🙏 Acknowledgments

- **HSGS Le Quy Don - Nam Nha Trang** - For inspiration and support
- **English 1 Class (23-26)** - Beta testing and feedback
- **Groq** - For providing powerful AI APIs
- **Cloudinary** - For reliable media storage
- **Open Source Community** - For amazing tools and libraries

### Technologies Used

- [React](https://reactjs.org/) - Frontend framework
- [Flask](https://flask.palletsprojects.com/) - Backend framework
- [Groq API](https://groq.com/) - AI transcription & grading
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Cloudinary](https://cloudinary.com/) - Media storage
- [Lucide](https://lucide.dev/) - Icon library

---

## 🎓 Educational Purpose

This project was developed as part of an English language learning initiative at HSGS Le Quy Don. It aims to democratize access to high-quality speaking practice resources for all students preparing for the NEC examination.

---

## 💖 Support the Project

If necs. has helped you improve your speaking skills, consider supporting its development:

**Bank Transfer (Vietnam)**
- Name: NGUYEN HOANG MINH TRI
- Account: 1041802514
- Bank: Vietcombank

Your support helps maintain servers, improve AI models, and keep necs. free for all students!

---

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/yourusername/necs?style=social)
![GitHub forks](https://img.shields.io/github/forks/yourusername/necs?style=social)
![GitHub issues](https://img.shields.io/github/issues/yourusername/necs)

---

**Made with ❤️ by student, for students**
