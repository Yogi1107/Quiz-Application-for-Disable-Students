from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///quiz.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Database Models
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'teacher' or 'student'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    quizzes = db.relationship('Quiz', backref='creator', lazy=True, cascade='all, delete-orphan')
    results = db.relationship('QuizResult', backref='student', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Quiz(db.Model):
    __tablename__ = 'quizzes'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    questions = db.relationship('Question', backref='quiz', lazy=True, cascade='all, delete-orphan')
    results = db.relationship('QuizResult', backref='quiz', lazy=True, cascade='all, delete-orphan')

class Question(db.Model):
    __tablename__ = 'questions'
    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.id'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    option_a = db.Column(db.String(500), nullable=False)
    option_b = db.Column(db.String(500), nullable=False)
    option_c = db.Column(db.String(500), nullable=False)
    option_d = db.Column(db.String(500), nullable=False)
    correct_answer = db.Column(db.String(1), nullable=False)  # A, B, C, or D
    order_num = db.Column(db.Integer, nullable=False)

class QuizResult(db.Model):
    __tablename__ = 'quiz_results'
    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    percentage = db.Column(db.Float, nullable=False)
    answers = db.Column(db.Text, nullable=False)  # JSON string
    completed_at = db.Column(db.DateTime, default=datetime.utcnow)

# Routes
@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')
    
    # Validation
    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'message': 'Username already exists'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'Email already registered'}), 400
    
    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400
    
    # Create user
    user = User(username=username, email=email, role=role)
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    session['user_id'] = user.id
    session['username'] = user.username
    session['role'] = user.role
    
    return jsonify({'success': True, 'message': 'Registration successful', 'role': user.role})

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')
    
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.check_password(password):
        return jsonify({'success': False, 'message': 'Invalid username or password'}), 401
    
    if user.role != role:
        return jsonify({'success': False, 'message': f'This account is registered as a {user.role}, not a {role}'}), 403
    
    session['user_id'] = user.id
    session['username'] = user.username
    session['role'] = user.role
    
    return jsonify({'success': True, 'message': 'Login successful', 'role': user.role})

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('index'))
    return render_template('dashboard.html', 
                         username=session['username'], 
                         role=session['role'])

@app.route('/api/quizzes', methods=['GET', 'POST'])
def quizzes():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    if request.method == 'POST':
        # Create quiz
        if session['role'] != 'teacher':
            return jsonify({'success': False, 'message': 'Only teachers can create quizzes'}), 403
        
        data = request.get_json()
        
        quiz = Quiz(
            title=data['title'],
            description=data['description'],
            created_by=session['user_id']
        )
        db.session.add(quiz)
        db.session.flush()
        
        for idx, q in enumerate(data['questions']):
            question = Question(
                quiz_id=quiz.id,
                question_text=q['question'],
                option_a=q['options'][0],
                option_b=q['options'][1],
                option_c=q['options'][2],
                option_d=q['options'][3],
                correct_answer=q['correctAnswer'],
                order_num=idx
            )
            db.session.add(question)
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Quiz created successfully', 'quiz_id': quiz.id})
    
    else:
        # Get quizzes
        if session['role'] == 'teacher':
            quizzes = Quiz.query.filter_by(created_by=session['user_id']).all()
        else:
            quizzes = Quiz.query.all()
        
        quiz_list = []
        for quiz in quizzes:
            quiz_data = {
                'id': quiz.id,
                'title': quiz.title,
                'description': quiz.description,
                'created_by': quiz.creator.username,
                'created_at': quiz.created_at.isoformat(),
                'question_count': len(quiz.questions),
                'attempts': len(quiz.results) if session['role'] == 'teacher' else None
            }
            
            if session['role'] == 'student':
                has_attempted = QuizResult.query.filter_by(
                    quiz_id=quiz.id, 
                    student_id=session['user_id']
                ).first() is not None
                quiz_data['has_attempted'] = has_attempted
            
            quiz_list.append(quiz_data)
        
        return jsonify({'success': True, 'quizzes': quiz_list})

@app.route('/api/quizzes/<int:quiz_id>', methods=['GET', 'DELETE'])
def quiz_detail(quiz_id):
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    quiz = Quiz.query.get_or_404(quiz_id)
    
    if request.method == 'DELETE':
        if session['role'] != 'teacher' or quiz.created_by != session['user_id']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        db.session.delete(quiz)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Quiz deleted successfully'})
    
    else:
        questions = Question.query.filter_by(quiz_id=quiz_id).order_by(Question.order_num).all()
        
        quiz_data = {
            'id': quiz.id,
            'title': quiz.title,
            'description': quiz.description,
            'created_by': quiz.creator.username,
            'created_at': quiz.created_at.isoformat(),
            'questions': []
        }
        
        for q in questions:
            question_data = {
                'id': q.id,
                'question': q.question_text,
                'options': [q.option_a, q.option_b, q.option_c, q.option_d]
            }
            
            # Only include correct answer for teachers or after submission
            if session['role'] == 'teacher':
                question_data['correctAnswer'] = q.correct_answer
            
            quiz_data['questions'].append(question_data)
        
        return jsonify({'success': True, 'quiz': quiz_data})

@app.route('/api/quizzes/<int:quiz_id>/submit', methods=['POST'])
def submit_quiz(quiz_id):
    if 'user_id' not in session or session['role'] != 'student':
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    quiz = Quiz.query.get_or_404(quiz_id)
    data = request.get_json()
    
    answers = data.get('answers', [])
    questions = Question.query.filter_by(quiz_id=quiz_id).order_by(Question.order_num).all()
    
    score = 0
    detailed_answers = []
    
    for idx, question in enumerate(questions):
        user_answer = answers[idx] if idx < len(answers) else None
        is_correct = user_answer == question.correct_answer
        
        if is_correct:
            score += 1
        
        detailed_answers.append({
            'question_id': question.id,
            'selected': user_answer,
            'correct': question.correct_answer,
            'is_correct': is_correct
        })
    
    total = len(questions)
    percentage = (score / total * 100) if total > 0 else 0
    
    result = QuizResult(
        quiz_id=quiz_id,
        student_id=session['user_id'],
        score=score,
        total_questions=total,
        percentage=percentage,
        answers=json.dumps(detailed_answers)
    )
    
    db.session.add(result)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'score': score,
        'total': total,
        'percentage': round(percentage, 2),
        'answers': detailed_answers
    })

@app.route('/api/results')
def get_results():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    if session['role'] == 'teacher':
        # Get results for teacher's quizzes
        teacher_quizzes = Quiz.query.filter_by(created_by=session['user_id']).all()
        quiz_ids = [q.id for q in teacher_quizzes]
        
        results = QuizResult.query.filter(QuizResult.quiz_id.in_(quiz_ids)).all()
        
        results_data = []
        for result in results:
            results_data.append({
                'quiz_title': result.quiz.title,
                'student_name': result.student.username,
                'score': result.score,
                'total': result.total_questions,
                'percentage': result.percentage,
                'completed_at': result.completed_at.isoformat()
            })
        
        return jsonify({'success': True, 'results': results_data})
    
    else:
        # Get student's results
        results = QuizResult.query.filter_by(student_id=session['user_id']).all()
        
        results_data = []
        for result in results:
            results_data.append({
                'quiz_id': result.quiz_id,
                'quiz_title': result.quiz.title,
                'score': result.score,
                'total': result.total_questions,
                'percentage': result.percentage,
                'completed_at': result.completed_at.isoformat(),
                'answers': json.loads(result.answers)
            })
        
        return jsonify({'success': True, 'results': results_data})

# Create tables
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)