import os
import datetime
import secrets
import json
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import requests # For making HTTP requests to Gemini API

# --- App Initialization ---
app = Flask(__name__)
CORS(app)

# --- Configuration ---
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_hex(16))
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///yecs.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Get Gemini API Key from environment variables
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')

db = SQLAlchemy(app)

# --- Database Models (remain the same) ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    firebase_uid = db.Column(db.String(128), unique=True, nullable=False)
    # ... (rest of the model is unchanged)

class BusinessProfile(db.Model):
    # ... (model is unchanged)
    pass

class FinancialData(db.Model):
    # ... (model is unchanged)
    pass

class CreditScore(db.Model):
    # ... (model is unchanged)
    pass

# --- Gemini API Integration ---
def call_gemini_api(prompt):
    if not GEMINI_API_KEY:
        return {"error": "Gemini API key is not configured."}

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    headers = {'Content-Type': 'application/json'}

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status() # Raise an exception for bad status codes
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error calling Gemini API: {e}")
        return {"error": f"Could not connect to Gemini API: {e}"}

# --- API Endpoints ---

@app.route('/api/calculate-score-gemini', methods=['POST'])
def calculate_score_with_gemini():
    user_data = request.get_json()
    if not user_data:
        return jsonify({"error": "No data provided"}), 400

    # Detailed prompt for Gemini Pro
    prompt = f"""
    Analyze the following profile of a young entrepreneur and generate a YECS (Young Entrepreneur Credit Score).
    The score should be between 300 and 850.

    User Data:
    {json.dumps(user_data, indent=2)}

    Scoring Weights:
    - Business Viability: 25%
    - Payment History (Simulated from financial stability): 20%
    - Financial Management: 18%
    - Personal Credit (Simulated from debt/income): 15%
    - Education Background: 12%
    - Social Verification (Simulated): 10%

    Based on this data, provide a JSON response with the following structure:
    {{
      "yecs_score": <integer>,
      "risk_level": "<Low/Medium/High>",
      "reasoning": "<A brief, one-sentence explanation for the score>",
      "component_scores": {{
        "business_viability": <integer_score_0_to_100>,
        "payment_history": <integer_score_0_to_100>,
        "financial_management": <integer_score_0_to_100>,
        "personal_credit": <integer_score_0_to_100>,
        "education_background": <integer_score_0_to_100>,
        "social_verification": <integer_score_0_to_100>
      }}
    }}
    """

    gemini_response = call_gemini_api(prompt)

    if "error" in gemini_response:
        return jsonify(gemini_response), 500

    try:
        # Extract the JSON string from the response
        response_text = gemini_response['candidates'][0]['content']['parts'][0]['text']
        # Clean the response text to ensure it's valid JSON
        cleaned_text = response_text.strip().replace('```json', '').replace('```', '')
        score_data = json.loads(cleaned_text)
        return jsonify(score_data), 200
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        print(f"Error parsing Gemini response: {e}")
        print(f"Raw response: {gemini_response}")
        return jsonify({"error": "Failed to parse the score from AI response."}), 500


@app.route('/api/ai-insights-gemini', methods=['POST'])
def get_ai_insights_from_gemini():
    user_data = request.get_json()
    if not user_data:
        return jsonify({"error": "No user data provided"}), 400

    prompt = f"""
    You are YECS AI, a world-class financial assistant for young entrepreneurs.
    Analyze the user's data and provide personalized insights.

    User Data:
    {json.dumps(user_data, indent=2)}

    Generate a JSON response with the following structure:
    {{
      "marketAlert": "<A relevant, one-sentence market insight for their industry. Example: 'SBA loan rates for the Tech industry have decreased by 0.25% this quarter.'>",
      "loanRecommendations": [
        {{
          "type": "<Loan Type (e.g., SBA Microloan)>",
          "rate": "<Interest Rate (e.g., 6.5%)>",
          "amount": "<Max Amount (e.g., $50,000)>",
          "reason": "<A short, compelling reason why this loan fits their profile.>"
        }}
      ],
      "creditImprovements": [
        {{
          "title": "<Short title for the improvement area (e.g., Optimize Debt-to-Income)>",
          "action": "<A specific, actionable tip for the user.>",
          "impact": "<Estimated point increase (e.g., +15-25 points)>"
        }}
      ]
    }}
    Provide exactly 3 loan recommendations and 2 credit improvements.
    """

    gemini_response = call_gemini_api(prompt)

    if "error" in gemini_response:
        return jsonify(gemini_response), 500

    try:
        response_text = gemini_response['candidates'][0]['content']['parts'][0]['text']
        cleaned_text = response_text.strip().replace('```json', '').replace('```', '')
        insights_data = json.loads(cleaned_text)
        return jsonify(insights_data), 200
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        print(f"Error parsing Gemini insights response: {e}")
        print(f"Raw response: {gemini_response}")
        return jsonify({"error": "Failed to parse insights from AI response."}), 500

# Health check endpoint
@app.route('/')
def index():
    return "YECS Gemini-Powered Backend is running!"

if __name__ == '__main__':
    # This part is for local development, not for production on Render
    # In a real local setup, you'd use a .env file for the API key
    app.run(debug=True, port=5001)

