# ExamVoice — Accessible Exam Platform for Visually Impaired Students

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-3.0-black?logo=flask)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue?logo=postgresql)
![License](https://img.shields.io/badge/License-MIT-green)
![Accessibility](https://img.shields.io/badge/WCAG-2.1%20AA-blueviolet)

## The Problem

## The Problem

During my graduation, I used to write exams for visually impaired students appearing for higher secondary examinations. In most cases the experience was cooperative — but I also witnessed moments where communication broke down, students were left waiting, or the level of assistance fell short of what they needed.

What struck me most was how completely a student's performance depended on another person being present, patient, and attentive.

ExamVoice is my attempt to answer that question.

## Features

| Feature | Details |
|---|---|
| 🎙️ Voice navigation | Full voice command control via Web Speech API (Chrome) |
| ⌨️ Keyboard shortcuts | Works across all browsers without voice |
| ♿ Screen reader support | ARIA live regions, skip links, semantic landmarks (WCAG 2.1 AA) |
| 👩‍🏫 Teacher dashboard | Create quizzes, view results, track student performance |
| 🎓 Student dashboard | Browse and take quizzes, review detailed results |

## Screenshots

<img src="assets/Login_Register.png" alt="Login page with Teacher and Student role selection cards" width="700">

<img src="assets/teacher_dashboard.png" alt="Teacher dashboard showing quiz list and student result analytics" width="700">

<img src="assets/student_dashboard.png" alt="Student quiz view showing voice command indicator and multiple choice options" width="700">

## Project Structure

```
examvoice/
│
├── app.py                 # Application factory
├── extensions.py          # SQLAlchemy db instance
├── demo_accounts.py       # demo_accounts to be created
├── models.py              # Database models
├── routes.py              # All route handlers (Blueprint)
├── requirements.txt       # Python dependencies
├── .env                   # Environment variable template
│
├── templates/
│   ├── base.html          # Base template with accessibility infrastructure
│   ├── index.html         # Login / registration page
│   └── dashboard.html     # Role-aware dashboard (teacher / student)
│
└── static/
    ├── css/
    │   └── style.css      # Custom styles
    └── js/
        ├── main.js        # Shared utilities (toast, fetch wrapper, TTS)
        ├── auth.js        # Login and registration logic
        ├── teacher.js     # Teacher dashboard interactions
        └── student.js     # Student quiz-taking and voice commands
```

## Tech Stack

- **Backend:** Python 3.10+, Flask 3.0, Flask-SQLAlchemy
- **Database:** PostgreSQL 15+ (JSONB for quiz answers, GIN index for fast querying)
- **Frontend:** Bootstrap 5, Vanilla JS, Web Speech API
- **Auth:** Session-based with Werkzeug password hashing

## Getting Started

### Prerequisites

- Python 3.10+
- PostgreSQL 15+

### 1. Clone the repository

```bash
git clone https://github.com/your-username/examvoice.git
cd examvoice
```

### 2. Set up a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate        # Linux / macOS
# venv\Scripts\activate         # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
SECRET_KEY=change-this-to-a-long-random-string
DATABASE_URL=postgresql://quiz_user:your_password@localhost:5432/examvoice
```

> ⚠️ Never commit `.env` to version control. It is listed in `.gitignore`.

### 5. Set up PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE examvoice;
CREATE USER quiz_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE examvoice TO quiz_user;

-- PostgreSQL 15+ only:
\c examvoice
GRANT ALL ON SCHEMA public TO quiz_user;
\q
```

### 6. Run the application

```bash
python app.py
```

Visit: [http://127.0.0.1:5000](http://127.0.0.1:5000)

## Demo Accounts

> ⚠️ These are for local development only. Remove or change credentials before any deployment.

| Role | Username | Password |
|---|---|---|
| Teacher | `demo_teacher` | `demo123` |
| Student | `demo_student` | `demo123` |

To create them, run:

```bash
python demo_accounts.py
```

## Voice Commands (Student Mode)

| Command | Action |
|---|---|
| `"Repeat question"` | Re-reads the current question |
| `"Repeat options"` | Re-reads all four answer options |
| `"Option A/B/C/D"` | Selects that answer |
| `"Yes"` | Confirms and moves to next question |
| `"No"` | Stays on current question |

> Voice commands require Chrome or a Chromium-based browser. All functions are also available via keyboard and mouse.

## Database Schema

```
users          → id, username, email, password_hash, role, created_at
quizzes        → id, title, description, created_by (FK), created_at
questions      → id, quiz_id (FK), question_text, option_a–d, correct_answer, order_num
quiz_results   → id, quiz_id (FK), student_id (FK), score, total_questions, percentage, answers (JSONB), completed_at
```

## Production Deployment

Use Gunicorn behind a reverse proxy (e.g. Nginx):

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

Key production checklist:
- [ ] Set a strong `SECRET_KEY`
- [ ] Enable HTTPS via Nginx / Caddy
- [ ] Set `debug=False`
- [ ] Add rate limiting (e.g. Flask-Limiter)
- [ ] Rotate demo credentials or remove them entirely

## Troubleshooting

**PostgreSQL not connecting**
```bash
sudo systemctl status postgresql
sudo systemctl restart postgresql
```

**Port 5000 in use**
```bash
lsof -i :5000
kill -9 <PID>
```

**Import errors**
```bash
pip install --upgrade -r requirements.txt
```

## License

[MIT](LICENSE)
