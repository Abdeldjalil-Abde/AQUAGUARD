# 💧 AquaGuard — Système de surveillance de la qualité de l'eau

## 🧱 Pile technologique

| Couche | Technologie |
|--------|-------------|
| **Backend** | Flask (Python) + scikit-learn |
| **Frontend** | HTML / CSS / JavaScript + Chart.js |
| **IA** | Random Forest + Régression Linéaire (sklearn) |
| **Base de données** | InfluxDB Cloud (time-series, AWS us-east-1) |

---

## 📦 Installation

```bash
pip install flask flask-cors scikit-learn pandas numpy influxdb-client
```

---

## ⚙️ Configuration InfluxDB Cloud

Avant de démarrer, renseignez vos identifiants InfluxDB Cloud dans `app.py` :

```python
INFLUX_URL    = "https://us-east-1-1.aws.cloud2.influxdata.com"
INFLUX_TOKEN  = "votre_token_ici"   # API Token généré dans l'UI Cloud
INFLUX_ORG    = "INFLUX_ORG"  # Org ID (visible dans l'URL de votre espace)
INFLUX_BUCKET = "water_quality"     # Bucket à créer dans l'UI Cloud
```

### Créer le bucket

```
InfluxDB Cloud UI
  → Load Data → Buckets → Create Bucket
    → Name        : water_quality
    → Data Expiry : 30 jours (limite Free Tier)
```

### Générer un token API

```
InfluxDB Cloud UI
  → Load Data → API Tokens → Generate API Token → All Access Token
```

---

## 🚀 Démarrage

```bash
# 1. Lancer le backend Flask
python app.py

# 2. Ouvrir le frontend
#    Double-clic sur index.html
#    — ou via serveur local :
python -m http.server 8080
# → http://localhost:8080
```

---

## 🔌 Points de terminaison de l'API

| Route | Description |
|-------|-------------|
| `GET /data` | Données capteurs + WQI + prédiction IA (écrit dans InfluxDB) |
| `GET /predict` | Prédictions sur 5 mesures futures |
| `GET /alerts` | Alertes actives (seuils OMS) |
| `GET /alerts/history` | Historique des alertes (filtrable par sévérité / paramètre) |
| `GET /history` | Tampon mémoire des 50 dernières lectures |
| `GET /history/influx` | **Historique persistant depuis InfluxDB Cloud** |
| `GET /stats` | Statistiques min / max / moyenne / écart-type |

### Paramètres de `/history/influx`

| Paramètre | Type | Défaut | Exemple |
|-----------|------|--------|---------|
| `range` | string | `1h` | `6h`, `24h`, `7d` |
| `field` | string | tous | `ph`, `temperature`, `turbidity` |

```bash
# Toutes les données de la dernière heure
curl http://localhost:5050/history/influx

# Les 24 dernières heures, uniquement le pH
curl "http://localhost:5050/history/influx?range=24h&field=ph"
```

---

## 📊 Paramètres de surveillance

| Paramètre | Unité | Seuil Min (OMS) | Seuil Max (OMS) |
|-----------|-------|-----------------|-----------------|
| Température | °C | 10 | 30 |
| pH | — | 6.5 | 8.5 |
| Turbidité | NTU | 0 | 4.0 |
| Conductivité | µS/cm | 50 | 500 |
| Oxygène Dissous | mg/L | 5.0 | 14 |
| SO₂ | mg/L | 0 | 0.1 |

---

## 🗄️ Structure des données dans InfluxDB

Chaque lecture capteur produit **un point** dans la mesure `water_quality` :

| Champ | Type | Description |
|-------|------|-------------|
| `temperature` | float | Température (°C) |
| `ph` | float | pH |
| `turbidity` | float | Turbidité (NTU) |
| `conductivity` | float | Conductivité (µS/cm) |
| `dissolved_o2` | float | Oxygène dissous (mg/L) |
| `so2` | float | Dioxyde de soufre (mg/L) |
| `wqi` | float | Indice de qualité de l'eau (0–100) |
| `pollution_rf` | float | Pollution estimée — Random Forest (%) |
| `pollution_lr` | float | Pollution estimée — Régression Linéaire (%) |
| `pollution_average` | float | Moyenne des deux modèles (%) |

**Tag** : `source=simulator`
**Fréquence** : 1 point toutes les 3 secondes ≈ 28 800 points/jour
(très en dessous de la limite Free Tier : 5 MB / 5 min)

---

## 🧠 Modèles IA

- **Algorithme principal** : Random Forest (80 arbres, profondeur max 8)
- **Algorithme secondaire** : Régression Linéaire
- **Entraînement** : 2 000 échantillons synthétiques avec niveaux de pollution variés
- **Sortie** : Pourcentage de pollution (0–100 %)
- **Prédictions** : 5 mesures futures avec WQI et classification

---

## 🎨 Interface

- 4 pages : Tableau de bord · Statistiques · Prédiction IA · Alertes
- Rafraîchissement toutes les 3 secondes
- Indicateur visuel WQI (vert / orange / rouge)
- Alertes en temps réel WARNING / CRITICAL

---

## 🔮 Extensions possibles

- Connexion aux appareils IoT réels (Raspberry Pi / Arduino)
- Export des données CSV / PDF depuis InfluxDB
- Notifications par email / SMS sur dépassement de seuil
- Tableau de bord multi-sites avec tags InfluxDB
- Grafana connecté au bucket `water_quality` pour visualisation avancée