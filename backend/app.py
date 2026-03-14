from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np

app = Flask(__name__)
CORS(app)

model = joblib.load("../model/pcod_model.pkl")

@app.route("/")
def home():
    return "MahilaSakhi PCOD API Running"

@app.route('/predict', methods=['POST'])
def predict():

    data = request.get_json()

    features = data['features']

    prediction = model.predict([features])[0]

    if prediction == 1:
        result = "High Risk of PCOD"
    else:
        result = "Low Risk of PCOD"

    return jsonify({
        "prediction": result
    })

if __name__ == "__main__":
    app.run(debug=True)