import os
from flask import Flask
from extensions import db
from routes import main
from dotenv import load_dotenv

load_dotenv()


def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-change-me')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///quiz.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    app.register_blueprint(main)

    with app.app_context():
        db.create_all()

    return app


app = create_app()  # ← moved outside the function

if __name__ == '__main__':
    app.run(debug=True)