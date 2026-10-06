import os
import sys
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score
import joblib

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "model")

# Auto-detect dataset file (prefer event_recommendation_5000.csv)
csv_filename = "event_recommendation_5000.csv"
if os.path.exists(DATA_DIR):
    csv_files = [f for f in os.listdir(DATA_DIR) if f.endswith('.csv')]
    if csv_files and "event_recommendation_5000.csv" not in csv_files:
        csv_filename = csv_files[0]

CSV_PATH = os.path.join(DATA_DIR, csv_filename)
MODEL_PATH = os.path.join(MODEL_DIR, "recommendation_model.joblib")

# Required features as specified in project requirements
REQUIRED_COLUMNS = [
    "user_interest",
    "location",
    "budget",
    "event_category",
    "event_price",
    "event_popularity"
]

CATEGORICAL_FEATURES = ["user_interest", "location", "event_category"]
NUMERICAL_FEATURES = ["budget", "event_price", "event_popularity"]

def train():
    print("=" * 60)
    print("AI Event Recommendation System - ML Model Training")
    print("=" * 60)

    # 1. Check if dataset exists
    if not os.path.exists(CSV_PATH):
        print(f"\n[ERROR] Training dataset not found!")
        print(f"Expected file at: {CSV_PATH}")
        print("Please place your 'event_recommendation_5000.csv' in the 'ml_service/data/' directory.")
        print(f"Required columns: {', '.join(REQUIRED_COLUMNS)}")
        sys.exit(1)

    print(f"\n[1/5] Loading dataset from: {CSV_PATH}")
    try:
        df = pd.read_csv(CSV_PATH)
    except Exception as e:
        print(f"[ERROR] Failed to read CSV file: {e}")
        sys.exit(1)

    print(f"Dataset shape: {df.shape[0]} rows, {df.shape[1]} columns")

    # 2. Validate columns
    missing_columns = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_columns:
        print(f"\n[ERROR] Dataset is missing the following required columns:")
        for col in missing_columns:
            print(f"  - {col}")
        print(f"\nFound columns in file: {list(df.columns)}")
        print(f"Expected columns: {REQUIRED_COLUMNS}")
        sys.exit(1)

    print(f"[2/5] All 6 required columns verified:")
    for col in REQUIRED_COLUMNS:
        print(f"  ✓ {col}")

    # Keep only the required columns and drop nulls
    data = df[REQUIRED_COLUMNS].dropna().copy()
    print(f"Valid records after null check: {len(data)}")

    # 3. Prepare features and target label
    # The dataset contains 6 columns representing positive recommendations/matches.
    # To train LogisticRegression classifier P(match=1 | features), we construct balanced
    # negative pairs using negative sampling (standard recommendation practice).
    print("\n[3/5] Preparing feature pipeline and training instances...")

    pos_df = data.copy()
    pos_df["target"] = 1

    # Generate balanced negative samples by permuting event features to simulate mismatches
    neg_df = data.copy()
    np.random.seed(42)
    # Permute category, price, and reduce popularity to create realistic negative samples
    neg_df["event_category"] = np.random.permutation(neg_df["event_category"].values)
    neg_df["event_price"] = np.random.permutation(neg_df["event_price"].values)
    neg_df["event_popularity"] = np.clip(
        neg_df["event_popularity"].values * np.random.uniform(0.1, 0.5, size=len(neg_df)),
        0,
        100
    )
    neg_df["target"] = 0

    combined_df = pd.concat([pos_df, neg_df], ignore_index=True)
    X = combined_df[REQUIRED_COLUMNS]
    y = combined_df["target"].values

    print(f"Total training instances (positive + negative): {len(combined_df)}")

    # 4. Build Sklearn Pipeline: ColumnTransformer + LogisticRegression
    print("\n[4/5] Building ML Pipeline:")
    print("  - OneHotEncoder on categorical features: user_interest, location, event_category")
    print("  - StandardScaler on numerical features: budget, event_price, event_popularity")
    print("  - LogisticRegression(max_iter=1000)")

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
            ("num", StandardScaler(), NUMERICAL_FEATURES)
        ]
    )

    model_pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("classifier", LogisticRegression(max_iter=1000, random_state=42))
    ])

    # Train / Test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("\nTraining Logistic Regression model...")
    model_pipeline.fit(X_train, y_train)

    # Evaluation
    y_pred = model_pipeline.predict(X_test)
    y_proba = model_pipeline.predict_proba(X_test)[:, 1]
    acc = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_proba)

    print("\n--- Training Evaluation Metrics ---")
    print(f"Accuracy:  {acc * 100:.2f}%")
    print(f"ROC-AUC:   {auc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, digits=4))

    # 5. Save model
    print(f"[5/5] Saving model...")
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model_pipeline, MODEL_PATH)
    print(f"✓ Model successfully saved to: {MODEL_PATH}")
    print("=" * 60)
    print("Model training complete! Ready for ML recommendation service.")
    print("=" * 60)

if __name__ == "__main__":
    train()
