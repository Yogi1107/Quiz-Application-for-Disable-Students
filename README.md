# Flask Quiz Platform - Setup Instructions

## Project Structure
```
quiz_platform/
│
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables (create this)
│
├── templates/
│   ├── base.html         # Base template
│   ├── index.html        # Login/Registration page
│   └── dashboard.html    # Dashboard for teachers/students
│
└── static/
    ├── css/
    │   └── style.css     # Custom styles
    └── js/
        ├── main.js       # Common JavaScript functions
        ├── auth.js       # Authentication logic
        ├── teacher.js    # Teacher dashboard logic
        └── student.js    # Student dashboard logic
```

## Requirements (requirements.txt)

```
Flask==3.0.0
Flask-SQLAlchemy==3.1.1
psycopg2-binary==2.9.9
python-dotenv==1.0.0
Werkzeug==3.0.1
```

## Environment Variables (.env)

Create a `.env` file in the project root:

```env
SECRET_KEY=your-secret-key-here-change-this-in-production
DATABASE_URL=postgresql://username:password@localhost:5432/quiz_platform
```

## PostgreSQL Database Setup

### 1. Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**macOS (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Windows:**
Download and install from https://www.postgresql.org/download/windows/

### 2. Create Database and User

```bash
# Access PostgreSQL
sudo -u postgres psql

# Inside PostgreSQL shell:
CREATE DATABASE quiz_platform;
CREATE USER quiz_user WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE quiz_platform TO quiz_user;

# For PostgreSQL 15+, also run:
\c quiz_platform
GRANT ALL ON SCHEMA public TO quiz_user;

\q
```

### 3. Update DATABASE_URL in .env

```env
DATABASE_URL=postgresql://quiz_user:your_password_here@localhost:5432/quiz_platform
```

## Installation Steps

### 1. Clone or Create Project Directory

```bash
mkdir quiz_platform
cd quiz_platform
```

### 2. Create Virtual Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Create Directory Structure

```bash
mkdir -p templates static/css static/js
```

### 5. Create All Files

Place the following files in their respective locations:
- `app.py` in the root directory
- HTML files in `templates/`
- CSS in `static/css/`
- JavaScript files in `static/js/`
- `.env` with your database credentials

### 6. Initialize Database

The application will automatically create tables on first run. Alternatively, you can do it manually:

```python
from app import app, db

with app.app_context():
    db.create_all()
    print("Database tables created successfully!")
```

### 7. Create Demo Accounts (Optional)

```python
from app import app, db, User
from werkzeug.security import generate_password_hash

with app.app_context():
    # Create demo teacher
    teacher = User(
        username='demo_teacher',
        email='teacher@demo.com',
        role='teacher'
    )
    teacher.set_password('demo123')
    
    # Create demo student
    student = User(
        username='demo_student',
        email='student@demo.com',
        role='student'
    )
    student.set_password('demo123')
    
    db.session.add(teacher)
    db.session.add(student)
    db.session.commit()
    
    print("Demo accounts created!")
```

## Running the Application

### Development Mode

```bash
# Make sure virtual environment is activated
python app.py
```

The application will be available at: http://127.0.0.1:5000/

### Production Mode

For production, use a WSGI server like Gunicorn:

```bash
# Install Gunicorn
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

## Usage

### Demo Accounts
- **Teacher:** 
  - Username: `demo_teacher`
  - Password: `demo123`
  
- **Student:**
  - Username: `demo_student`
  - Password: `demo123`

### Features

**For Teachers:**
1. Create quizzes with multiple-choice questions
2. Manage existing quizzes (view, delete)
3. View student results and statistics

**For Students:**
1. Browse available quizzes
2. Take quizzes with voice commands or mouse clicks
3. View quiz results and detailed answers

### Voice Commands (Student Mode)
- "Repeat question" - Repeats the current question
- "Repeat options" - Repeats all answer options
- "Option A/B/C/D" - Selects an answer
- "Yes" - Proceeds to next question
- "No" - Stays on current question

## Database Schema

### Users Table
- `id` (Primary Key)
- `username` (Unique)
- `email` (Unique)
- `password_hash`
- `role` (teacher/student)
- `created_at`

### Quizzes Table
- `id` (Primary Key)
- `title`
- `description`
- `created_by` (Foreign Key → Users)
- `created_at`

### Questions Table
- `id` (Primary Key)
- `quiz_id` (Foreign Key → Quizzes)
- `question_text`
- `option_a`, `option_b`, `option_c`, `option_d`
- `correct_answer` (A/B/C/D)
- `order_num`

### Quiz Results Table
- `id` (Primary Key)
- `quiz_id` (Foreign Key → Quizzes)
- `student_id` (Foreign Key → Users)
- `score`
- `total_questions`
- `percentage`
- `answers` (JSON)
- `completed_at`

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

### Module Import Errors

```bash
# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

## Security Notes

1. **Change SECRET_KEY:** Use a strong, random secret key in production
2. **Database Credentials:** Never commit `.env` file to version control
3. **HTTPS:** Use HTTPS in production (configure through reverse proxy like Nginx)
4. **Input Validation:** The app includes basic validation, but add more for production
5. **Rate Limiting:** Consider adding Flask-Limiter for API rate limiting

## Future Enhancements

- Quiz editing functionality
- Time limits for quizzes
- Question types (true/false, fill-in-the-blank)
- Quiz categories and tags
- Student progress tracking
- Export results to CSV/PDF
- Email notifications
- Admin dashboard

## License

MIT License - Feel free to use and modify for your needs.
