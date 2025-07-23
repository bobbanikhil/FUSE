import os
import datetime
import hashlib
import secrets
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt

# --- App Initialization ---
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# --- Configuration ---
# In a production environment, use environment variables for sensitive data.
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_hex(16))
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///yecs.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'

db = SQLAlchemy(app)


# --- Database Models ---
# These models define the structure of your database tables.
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    firebase_uid = db.Column(db.String(128), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    age = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    business_profile = db.relationship('BusinessProfile', backref='user', uselist=False, cascade="all, delete-orphan")
    financial_data = db.relationship('FinancialData', backref='user', uselist=False, cascade="all, delete-orphan")
    credit_scores = db.relationship('CreditScore', backref='user', lazy=True, cascade="all, delete-orphan")


class BusinessProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    business_name = db.Column(db.String(120))
    industry = db.Column(db.String(80))
    business_stage = db.Column(db.String(80))
    revenue_projection = db.Column(db.Float)
    years_of_experience = db.Column(db.Integer)
    education_level = db.Column(db.String(80))


class FinancialData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    monthly_income = db.Column(db.Float)
    monthly_expenses = db.Column(db.Float)
    savings_amount = db.Column(db.Float)
    debt_amount = db.Column(db.Float)


class CreditScore(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    yecs_score = db.Column(db.Integer)
    component_scores = db.Column(db.JSON)
    risk_level = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)


# --- API Endpoints ---

@app.route('/api/user', methods=['POST'])
def sync_user():
    """
    Creates or updates a user profile based on form data.
    This is the main endpoint for persisting data from the frontend.
    """
    data = request.get_json()
    if not data or not data.get('userId'):
        return jsonify({"error": "User ID is required"}), 400

    firebase_uid = data['userId']
    user = User.query.filter_by(firebase_uid=firebase_uid).first()

    # Create new user if they don't exist
    if not user:
        user = User(firebase_uid=firebase_uid)
        db.session.add(user)

    # Update personal data
    personal_data = data.get('personal', {})
    user.email = personal_data.get('email', user.email)
    user.first_name = personal_data.get('firstName', user.first_name)
    user.last_name = personal_data.get('lastName', user.last_name)
    user.age = personal_data.get('age', user.age)

    # Update or create business profile
    business_data = data.get('business', {})
    if business_data:
        if user.business_profile:
            for key, value in business_data.items():
                setattr(user.business_profile, key, value)
        else:
            user.business_profile = BusinessProfile(**business_data)

    # Update or create financial data
    financials_data = data.get('financials', {})
    if financials_data:
        if user.financial_data:
            for key, value in financials_data.items():
                setattr(user.financial_data, key, value)
        else:
            user.financial_data = FinancialData(**financials_data)

    try:
        db.session.commit()
        return jsonify({"message": "User profile synced successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to sync user profile", "details": str(e)}), 500


@app.route('/api/calculate-score', methods=['POST'])
def get_score():
    """
    Calculates the YECS score based on the provided user data.
    This is a stateless endpoint and does not require user authentication.
    """
    user_data = request.get_json()
    if not user_data:
        return jsonify({"error": "No data provided"}), 400

    score = 300
    components = {}

    # Business Viability (25%)
    business_score = 0
    business_info = user_data.get('business', {})
    if business_info.get('revenueProjection', 0) > 50000: business_score += 40
    if business_info.get('yearsExperience', 0) > 2: business_score += 35
    if business_info.get('businessStage') in ['MVP Ready', 'Early Customers',
                                              'Revenue Generating']: business_score += 25
    components['business_viability'] = business_score
    score += business_score * 1.25

    # Financial Management (18%)
    financial_score = 0
    financials_info = user_data.get('financials', {})
    income = financials_info.get('monthlyIncome', 0)
    expenses = financials_info.get('monthlyExpenses', 0)
    savings = financials_info.get('savingsAmount', 0)
    if income > 0:
        cash_flow = income - expenses
        if cash_flow > 500: financial_score += 50
        if expenses > 0 and savings > (expenses * 3): financial_score += 50
    components['financial_management'] = financial_score
    score += financial_score * 0.9

    # Add randomness for other factors to simulate a full score
    score += secrets.randbelow(150)

    final_score = min(int(score), 850)

    risk = "High"
    if final_score > 700:
        risk = "Low"
    elif final_score > 600:
        risk = "Medium"

    score_result = {
        "yecs_score": final_score,
        "component_scores": components,
        "risk_level": risk
    }

    return jsonify(score_result), 200


# Health check endpoint
@app.route('/')
def index():
    return "YECS Backend is running!"


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    # Use Gunicorn in production, this is for local development
    app.run(debug=True, port=5001)
