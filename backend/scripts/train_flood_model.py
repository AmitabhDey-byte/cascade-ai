import os
import joblib
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.ml.flood.feature import generate_synthetic_training_data, FEATURE_NAMES
from app.ml.flood.model import build_model

print("Generating training data...")
X, y = generate_synthetic_training_data(n_samples=1000)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print("Training Random Forest...")
model = build_model()
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
rmse   = np.sqrt(mean_squared_error(y_test, y_pred))
r2     = r2_score(y_test, y_pred)
print(f"RMSE: {rmse:.4f}")
print(f"R²:   {r2:.4f}")
weights_path = os.path.join(
    os.path.dirname(__file__), '..', 'app', 'ml', 'weights', 'flood_model.joblib'
)
joblib.dump(model, weights_path)
print(f"Model saved to {weights_path}")