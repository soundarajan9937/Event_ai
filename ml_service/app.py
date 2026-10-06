import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "recommendation_model.joblib")

# Load model once at startup (lightweight 512 MB RAM architecture)
model = None
if os.path.exists(MODEL_PATH):
    try:
        model = joblib.load(MODEL_PATH)
        logger.info(f"Successfully loaded trained recommendation model from {MODEL_PATH}")
    except Exception as e:
        logger.error(f"Failed to load model from {MODEL_PATH}: {e}")
else:
    logger.warning(
        f"Model file not found at {MODEL_PATH}. "
        "The service will run in fallback matching mode until 'python train_model.py' is executed."
    )

REQUIRED_FEATURES = [
    "user_interest",
    "location",
    "budget",
    "event_category",
    "event_price",
    "event_popularity"
]

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint for Render and backend monitoring."""
    return jsonify({
        "status": "ok",
        "model_loaded": model is not None
    }), 200

@app.route("/recommend", methods=["POST"])
def recommend():
    """
    Ranks currently available active events from MongoDB Atlas based on user preferences.
    
    Expected JSON payload:
    {
        "user_interest": "Technology",
        "location": "Chennai",
        "budget": 1000,
        "event_category": "Workshop",
        "events": [
            {
                "event_id": "...",
                "name": "...",
                "category": "...",
                "location": "...",
                "price": 500,
                "popularity": 75
            }
        ]
    }
    """
    global model
    try:
        data = request.get_json(force=True, silent=True)
        if not data:
            return jsonify({"error": "Invalid JSON body provided"}), 400

        user_interest = str(data.get("user_interest", "")).strip()
        location = str(data.get("location", "")).strip()
        budget = float(data.get("budget", 0) or 0)
        event_category = str(data.get("event_category", "")).strip()
        events = data.get("events", [])

        if not events:
            return jsonify({"recommendations": []}), 200

        # Attempt to load model if it was trained after service startup
        if model is None and os.path.exists(MODEL_PATH):
            try:
                model = joblib.load(MODEL_PATH)
                logger.info("Dynamically loaded newly trained model from disk.")
            except Exception as ex:
                logger.error(f"Failed to dynamically load model: {ex}")

        recommendations = []

        if model is not None:
            # 1. Use trained Logistic Regression Pipeline
            feature_rows = []
            for ev in events:
                ev_category = str(ev.get("category", "")).strip()
                ev_location = str(ev.get("location", "")).strip()
                ev_price = float(ev.get("price", 0) or 0)
                ev_popularity = float(ev.get("popularity", 50) or 50)

                feature_rows.append({
                    "user_interest": user_interest,
                    "location": ev_location if ev_location else location,
                    "budget": budget,
                    "event_category": ev_category if ev_category else event_category,
                    "event_price": ev_price,
                    "event_popularity": ev_popularity
                })

            df_input = pd.DataFrame(feature_rows)[REQUIRED_FEATURES]
            
            # Predict probabilities of class 1 (match)
            probabilities = model.predict_proba(df_input)[:, 1]

            for i, ev in enumerate(events):
                event_id = str(ev.get("event_id") or ev.get("_id") or ev.get("id"))
                raw_score = float(probabilities[i]) * 100.0
                match_score = round(float(np.clip(raw_score, 10.0, 99.5)), 1)
                
                recommendations.append({
                    "event_id": event_id,
                    "match_score": match_score
                })
        else:
            # 2. Heuristic fallback when model is not yet trained
            logger.info("Using fallback recommendation heuristic (model not yet trained).")
            for ev in events:
                event_id = str(ev.get("event_id") or ev.get("_id") or ev.get("id"))
                ev_category = str(ev.get("category", "")).strip().lower()
                ev_location = str(ev.get("location", "")).strip().lower()
                ev_price = float(ev.get("price", 0) or 0)
                ev_popularity = float(ev.get("popularity", 50) or 50)

                score = 50.0

                # Category match
                if event_category.lower() in ev_category or ev_category in event_category.lower():
                    score += 25.0
                elif user_interest.lower() in ev_category:
                    score += 15.0

                # Location match
                if location.lower() in ev_location or ev_location in location.lower():
                    score += 15.0

                # Budget match
                if ev_price <= budget:
                    score += 10.0
                elif budget > 0 and ev_price <= budget * 1.2:
                    score += 5.0
                else:
                    score -= 10.0

                # Popularity influence
                score += (ev_popularity / 100.0) * 10.0

                final_score = round(float(np.clip(score, 15.0, 98.0)), 1)
                recommendations.append({
                    "event_id": event_id,
                    "match_score": final_score
                })

        # Rank recommendations descending by match_score
        recommendations.sort(key=lambda x: x["match_score"], reverse=True)

        return jsonify({"recommendations": recommendations}), 200

    except Exception as e:
        logger.error(f"Error generating recommendations: {e}", exc_info=True)
        return jsonify({"error": "Failed to calculate recommendations", "details": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting ML Recommendation Service on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
