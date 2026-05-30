from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.dialects.postgresql import JSONB
from extensions import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # teacher or student
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    quizzes = db.relationship(
        'Quiz',
        backref='creator',
        lazy=True,
        cascade='all, delete-orphan'
    )

    results = db.relationship(
        'QuizResult',
        backref='student',
        lazy=True,
        cascade='all, delete-orphan'
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Quiz(db.Model):
    __tablename__ = 'quizzes'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    created_by = db.Column(
        db.Integer,
        db.ForeignKey('users.id'),
        nullable=False
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    questions = db.relationship(
        'Question',
        backref='quiz',
        lazy=True,
        cascade='all, delete-orphan',
        order_by='Question.order_num'
    )

    results = db.relationship(
        'QuizResult',
        backref='quiz',
        lazy=True,
        cascade='all, delete-orphan'
    )


class Question(db.Model):
    __tablename__ = 'questions'

    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(
        db.Integer,
        db.ForeignKey('quizzes.id'),
        nullable=False
    )

    question_text = db.Column(db.Text, nullable=False)

    option_a = db.Column(db.String(500), nullable=False)
    option_b = db.Column(db.String(500), nullable=False)
    option_c = db.Column(db.String(500), nullable=False)
    option_d = db.Column(db.String(500), nullable=False)

    correct_answer = db.Column(db.String(1), nullable=False)  # A, B, C, D
    order_num = db.Column(db.Integer, nullable=False)


class QuizResult(db.Model):
    __tablename__ = 'quiz_results'

    id = db.Column(db.Integer, primary_key=True)

    quiz_id = db.Column(
        db.Integer,
        db.ForeignKey('quizzes.id'),
        nullable=False
    )

    student_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id'),
        nullable=False
    )

    score = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    percentage = db.Column(db.Float, nullable=False)

    # Stores answers as PostgreSQL JSONB
    # Example:
    # {
    #     "1": "A",
    #     "2": "C",
    #     "3": "B"
    # }
    answers = db.Column(JSONB, nullable=False)

    completed_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    __table_args__ = (
        db.Index(
            'idx_quiz_results_answers_gin',
            'answers',
            postgresql_using='gin'
        ),
    )