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