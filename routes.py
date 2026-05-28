import json
from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from extensions import db
from models import User, Quiz, Question, QuizResult

main = Blueprint('main', __name__)


# ── Auth ────────────────────────────────────────────────────────────────────

@main.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('main.dashboard'))
    return render_template('index.html')


@main.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')

    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'message': 'Username already exists'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'Email already registered'}), 400

    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400

    user = User(username=username, email=email, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    session['user_id'] = user.id
    session['username'] = user.username
    session['role'] = user.role

    return jsonify({'success': True, 'message': 'Registration successful', 'role': user.role})


@main.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    username = data.get('username')
    password = data.get('password')
    role = data.get('role')

    user = User.query.filter_by(username=username).first()

    if not user or not user.check_password(password):
        return jsonify({'success': False, 'message': 'Invalid username or password'}), 401

    if user.role != role:
        return jsonify({
            'success': False,
            'message': f'This account is registered as a {user.role}, not a {role}'
        }), 403

    session['user_id'] = user.id
    session['username'] = user.username
    session['role'] = user.role

    return jsonify({'success': True, 'message': 'Login successful', 'role': user.role})


@main.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('main.index'))


@main.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('main.index'))
    return render_template('dashboard.html',
                           username=session['username'],
                           role=session['role'])


# ── Quizzes ─────────────────────────────────────────────────────────────────

@main.route('/api/quizzes', methods=['GET', 'POST'])
def quizzes():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401

    if request.method == 'POST':
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

    # GET
    if session['role'] == 'teacher':
        all_quizzes = Quiz.query.filter_by(created_by=session['user_id']).all()
    else:
        all_quizzes = Quiz.query.all()

    quiz_list = []
    for quiz in all_quizzes:
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
            quiz_data['has_attempted'] = QuizResult.query.filter_by(
                quiz_id=quiz.id,
                student_id=session['user_id']
            ).first() is not None

        quiz_list.append(quiz_data)

    return jsonify({'success': True, 'quizzes': quiz_list})


@main.route('/api/quizzes/<int:quiz_id>', methods=['GET', 'DELETE'])
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

    # GET
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
        if session['role'] == 'teacher':
            question_data['correctAnswer'] = q.correct_answer

        quiz_data['questions'].append(question_data)

    return jsonify({'success': True, 'quiz': quiz_data})


@main.route('/api/quizzes/<int:quiz_id>/submit', methods=['POST'])
def submit_quiz(quiz_id):
    if 'user_id' not in session or session['role'] != 'student':
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401

    quiz = Quiz.query.get_or_404(quiz_id)  # noqa: F841 — triggers 404 if missing
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


# ── Results ──────────────────────────────────────────────────────────────────

@main.route('/api/results')
def get_results():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401

    if session['role'] == 'teacher':
        teacher_quizzes = Quiz.query.filter_by(created_by=session['user_id']).all()
        quiz_ids = [q.id for q in teacher_quizzes]
        results = QuizResult.query.filter(QuizResult.quiz_id.in_(quiz_ids)).all()

        results_data = [{
            'quiz_title': r.quiz.title,
            'student_name': r.student.username,
            'score': r.score,
            'total': r.total_questions,
            'percentage': r.percentage,
            'completed_at': r.completed_at.isoformat()
        } for r in results]

    else:
        results = QuizResult.query.filter_by(student_id=session['user_id']).all()

        results_data = [{
            'quiz_id': r.quiz_id,
            'quiz_title': r.quiz.title,
            'score': r.score,
            'total': r.total_questions,
            'percentage': r.percentage,
            'completed_at': r.completed_at.isoformat(),
            'answers': json.loads(r.answers)
        } for r in results]

    return jsonify({'success': True, 'results': results_data})