from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import random
import math
import time
from datetime import datetime, timedelta
import json
from flask import render_template

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────
#  SENSOR SIMULATION ENGINE
# ─────────────────────────────────────────────
class SensorSimulator:
    def __init__(self):
        self.time_step = 0
        self.pollution_event = False
        self.pollution_start = 0

    def next(self):
        self.time_step += 1
        t = self.time_step

        # Random pollution events
        if random.random() < 0.02:
            self.pollution_event = True
            self.pollution_start = t
        if self.pollution_event and t - self.pollution_start > 20:
            self.pollution_event = False

        pollution_factor = 1.5 if self.pollution_event else 1.0
        sin_wave = math.sin(t * 0.1)

        return {
            "temperature": round(random.gauss(22 + sin_wave * 3, 0.8) * pollution_factor, 2),
            "ph":          round(random.gauss(7.2 - (pollution_factor - 1) * 0.8, 0.3), 2),
            "turbidity":   round(max(0, random.gauss(3.5 * pollution_factor, 1.2)), 2),
            "conductivity":round(max(0, random.gauss(350 * pollution_factor, 30)), 2),
            "dissolved_o2":round(max(0, random.gauss(8.5 / pollution_factor, 0.5)), 2),
            "so2":         round(max(0, random.gauss(0.05 * pollution_factor, 0.02)), 4),
            "timestamp":   datetime.now().isoformat()
        }

simulator = SensorSimulator()

# ─────────────────────────────────────────────
#  WATER QUALITY INDEX CALCULATOR (WHO-based)
# ─────────────────────────────────────────────
WHO_STANDARDS = {
    "ph":          {"ideal": 7.5,  "max": 8.5,  "min": 6.5,  "weight": 0.20},
    "turbidity":   {"ideal": 1.0,  "max": 4.0,  "min": 0.0,  "weight": 0.15},
    "dissolved_o2":{"ideal": 9.0,  "max": 14.0, "min": 5.0,  "weight": 0.25},
    "conductivity":{"ideal": 300,  "max": 500,  "min": 50,   "weight": 0.15},
    "temperature": {"ideal": 20.0, "max": 30.0, "min": 10.0, "weight": 0.10},
    "so2":         {"ideal": 0.01, "max": 0.1,  "min": 0.0,  "weight": 0.15},
}

def calculate_wqi(data):
    scores = {}
    total_weight = 0
    weighted_sum = 0

    for param, standards in WHO_STANDARDS.items():
        if param not in data:
            continue
        val = data[param]
        ideal = standards["ideal"]
        lo, hi = standards["min"], standards["max"]
        weight = standards["weight"]

        # Sub-index: distance from ideal, normalized 0-100
        if val <= ideal:
            sub = 100 * (val - lo) / max(ideal - lo, 1e-9) if (ideal - lo) > 0 else 100
        else:
            sub = 100 * (hi - val) / max(hi - ideal, 1e-9) if (hi - ideal) > 0 else 100
        sub = max(0, min(100, sub))

        scores[param] = round(sub, 1)
        weighted_sum += sub * weight
        total_weight += weight

    wqi = round(weighted_sum / total_weight if total_weight else 0, 1)

    if wqi >= 80:
        classification = "CLEAN"
        color = "#00e676"
    elif wqi >= 50:
        classification = "MODERATE"
        color = "#ffab00"
    else:
        classification = "POLLUTED"
        color = "#ff1744"

    return {"wqi": wqi, "classification": classification, "color": color, "sub_scores": scores}

# ─────────────────────────────────────────────
#  ML MODEL TRAINING
# ─────────────────────────────────────────────
def generate_training_data(n=2000):
    rows = []
    for _ in range(n):
        pollution = random.random()
        factor = 1 + pollution * 1.5
        temp = random.gauss(22 + pollution * 8, 2)
        ph = random.gauss(7.5 - pollution * 1.5, 0.4)
        turb = max(0, random.gauss(1 + pollution * 15, 2))
        cond = random.gauss(300 + pollution * 400, 50)
        do = max(0, random.gauss(9 - pollution * 6, 0.8))
        so2 = max(0, random.gauss(0.01 + pollution * 0.15, 0.02))

        wqi_data = {"ph": ph, "turbidity": turb, "dissolved_o2": do,
                    "conductivity": cond, "temperature": temp, "so2": so2}
        wqi = calculate_wqi(wqi_data)["wqi"]
        pollution_pct = round(100 - wqi, 2)

        rows.append({
            "temperature": temp, "ph": ph, "turbidity": turb,
            "conductivity": cond, "dissolved_o2": do, "so2": so2,
            "pollution_pct": pollution_pct
        })
    return pd.DataFrame(rows)

FEATURES = ["temperature", "ph", "turbidity", "conductivity", "dissolved_o2", "so2"]

print("⚙  Training ML models...")
df_train = generate_training_data(2000)
X = df_train[FEATURES]
y = df_train["pollution_pct"]

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

rf_model = RandomForestRegressor(n_estimators=80, max_depth=8, random_state=42)
rf_model.fit(X_scaled, y)

lr_model = LinearRegression()
lr_model.fit(X_scaled, y)

print("✅ Models trained successfully!")

# ─────────────────────────────────────────────
#  HISTORY BUFFER (circular, 100 entries)
# ─────────────────────────────────────────────
HISTORY = []
HISTORY_LIMIT = 100

# ─────────────────────────────────────────────
#  ALERT HISTORY (persistent, max 500 entries)
# ─────────────────────────────────────────────
ALERT_HISTORY = []
ALERT_HISTORY_LIMIT = 500

def add_to_history(reading, wqi_info):
    HISTORY.append({**reading, "wqi": wqi_info["wqi"],
                    "classification": wqi_info["classification"],
                    "color": wqi_info["color"]})
    if len(HISTORY) > HISTORY_LIMIT:
        HISTORY.pop(0)

# ─────────────────────────────────────────────
#  ALERT ENGINE
# ─────────────────────────────────────────────
THRESHOLDS = {
    "ph":           {"min": 6.5, "max": 8.5,   "unit": "",      "name": "pH"},
    "turbidity":    {"min": 0,   "max": 4.0,    "unit": " NTU",  "name": "Turbidité"},
    "dissolved_o2": {"min": 5.0, "max": 14.0,   "unit": " mg/L", "name": "Oxygène Dissous"},
    "temperature":  {"min": 10,  "max": 30.0,   "unit": "°C",    "name": "Température"},
    "conductivity": {"min": 50,  "max": 500,    "unit": " µS/cm","name": "Conductivité"},
    "so2":          {"min": 0,   "max": 0.1,    "unit": " mg/L", "name": "SO₂"},
}

def generate_alerts(reading, save_to_history=False):
    alerts = []
    now = datetime.now()
    for param, rule in THRESHOLDS.items():
        val = reading.get(param)
        if val is None:
            continue
        if val < rule["min"]:
            severity = "CRITICAL" if val < rule["min"] * 0.8 else "WARNING"
            alerts.append({
                "id": f"{param}_{int(time.time()*1000)}",
                "param": rule["name"],
                "value": f"{val}{rule['unit']}",
                "message": f"{rule['name']} trop bas : {val}{rule['unit']} (min {rule['min']}{rule['unit']})",
                "severity": severity,
                "timestamp": now.isoformat(),
                "resolved": False
            })
        elif val > rule["max"]:
            severity = "CRITICAL" if val > rule["max"] * 1.2 else "WARNING"
            alerts.append({
                "id": f"{param}_{int(time.time()*1000)}",
                "param": rule["name"],
                "value": f"{val}{rule['unit']}",
                "message": f"{rule['name']} trop élevé : {val}{rule['unit']} (max {rule['max']}{rule['unit']})",
                "severity": severity,
                "timestamp": now.isoformat(),
                "resolved": False
            })

    if save_to_history:
        # Mark resolved: params that were in last alert cycle but are now clean
        current_params = {a["param"] for a in alerts}
        if ALERT_HISTORY:
            for past in reversed(ALERT_HISTORY):
                if not past["resolved"] and past["param"] not in current_params:
                    past["resolved"] = True
                    past["resolved_at"] = now.isoformat()
        # Append new alerts to history
        for alert in alerts:
            ALERT_HISTORY.append(dict(alert))
        if len(ALERT_HISTORY) > ALERT_HISTORY_LIMIT:
            del ALERT_HISTORY[:len(ALERT_HISTORY) - ALERT_HISTORY_LIMIT]

    return alerts

# ─────────────────────────────────────────────
#  API ROUTES
# ─────────────────────────────────────────────

@app.route("/")
def home():
    return render_template("index.html")



@app.route("/data")
def get_data():
    reading = simulator.next()
    wqi_info = calculate_wqi(reading)
    add_to_history(reading, wqi_info)

    features_array = np.array([[reading[f] for f in FEATURES]])
    features_scaled = scaler.transform(features_array)
    pollution_rf = float(np.clip(rf_model.predict(features_scaled)[0], 0, 100))
    pollution_lr = float(np.clip(lr_model.predict(features_scaled)[0], 0, 100))

    return jsonify({
        "sensors": reading,
        "wqi": wqi_info,
        "pollution": {
            "random_forest": round(pollution_rf, 2),
            "linear_regression": round(pollution_lr, 2),
            "average": round((pollution_rf + pollution_lr) / 2, 2)
        },
        "alerts": generate_alerts(reading, save_to_history=True)
    })

@app.route("/predict")
def get_prediction():
    if len(HISTORY) < 5:
        return jsonify({"error": "Not enough history yet", "predictions": []})

    recent = HISTORY[-10:]
    last = recent[-1]

    predictions = []
    prev = {f: last[f] for f in FEATURES}

    for i in range(1, 6):
        noise = {f: random.gauss(0, 0.05 * abs(prev[f]) + 0.1) for f in FEATURES}
        next_vals = {f: prev[f] + noise[f] for f in FEATURES}
        next_vals["ph"] = np.clip(next_vals["ph"], 4.0, 10.0)
        next_vals["dissolved_o2"] = np.clip(next_vals["dissolved_o2"], 0, 14)
        next_vals["turbidity"] = max(0, next_vals["turbidity"])

        arr_scaled = scaler.transform([[next_vals[f] for f in FEATURES]])
        poll_rf = float(np.clip(rf_model.predict(arr_scaled)[0], 0, 100))
        wqi_p = calculate_wqi(next_vals)

        ts = datetime.now() + timedelta(seconds=i * 3)
        predictions.append({
            "step": i,
            "timestamp": ts.isoformat(),
            "values": {k: round(v, 3) for k, v in next_vals.items()},
            "pollution_pct": round(poll_rf, 2),
            "wqi": wqi_p["wqi"],
            "classification": wqi_p["classification"],
            "color": wqi_p["color"]
        })
        prev = next_vals

    # Feature importance
    importances = dict(zip(FEATURES, rf_model.feature_importances_.tolist()))

    return jsonify({
        "predictions": predictions,
        "feature_importance": {k: round(v * 100, 1) for k, v in importances.items()},
        "model": "Random Forest",
        "history_size": len(HISTORY)
    })

@app.route("/alerts")
def get_alerts():
    if not HISTORY:
        return jsonify({"alerts": [], "count": 0})
    last = HISTORY[-1]
    alerts = generate_alerts(last)
    return jsonify({"alerts": alerts, "count": len(alerts),
                    "timestamp": datetime.now().isoformat()})

@app.route("/alerts/history")
def get_alert_history():
    limit  = int(request.args.get("limit", 100))
    offset = int(request.args.get("offset", 0))
    severity_filter = request.args.get("severity")   # WARNING | CRITICAL
    param_filter    = request.args.get("param")

    result = list(reversed(ALERT_HISTORY))           # newest first
    if severity_filter:
        result = [a for a in result if a["severity"] == severity_filter]
    if param_filter:
        result = [a for a in result if a["param"] == param_filter]

    total = len(result)
    page  = result[offset: offset + limit]
    return jsonify({
        "history": page,
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": (offset + limit) < total
    })

@app.route("/history")
def get_history():
    limit = int(request.args.get("limit", 50))
    return jsonify({"history": HISTORY[-limit:], "total": len(HISTORY)})

@app.route("/stats")
def get_stats():
    if not HISTORY:
        return jsonify({})
    df = pd.DataFrame(HISTORY)
    stats = {}
    for col in FEATURES + ["wqi"]:
        if col in df:
            stats[col] = {
                "min":  round(float(df[col].min()), 3),
                "max":  round(float(df[col].max()), 3),
                "mean": round(float(df[col].mean()), 3),
                "std":  round(float(df[col].std()), 3)
            }
    return jsonify(stats)

if __name__ == "__main__":
    app.run(debug=False, port=5050, host="0.0.0.0")
