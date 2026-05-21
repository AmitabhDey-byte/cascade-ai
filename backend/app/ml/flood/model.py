from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


def build_model() -> Pipeline:
    """
    Builds the flood risk model pipeline.
    Using RandomForestRegressor — outputs a continuous risk score (0.0 – 1.0).

    Feature order (must match features.py):
        0: soil_moisture       — NASA SMAP (0–1)
        1: precip_24h          — mm total next 24h
        2: precip_48h          — mm total next 48h
        3: precip_72h          — mm total next 72h
        4: max_hourly_precip   — peak mm/h
        5: storm_risk          — binary 0/1
        6: elevation           — metres above sea level

    Returns:
        sklearn Pipeline (StandardScaler + RandomForestRegressor)
    """
    model = Pipeline([
        ("scaler", StandardScaler()),
        ("rf", RandomForestRegressor(
            n_estimators=200,
            max_depth=8,
            min_samples_split=4,
            random_state=42,
            n_jobs=-1,
        )),
    ])
    return model