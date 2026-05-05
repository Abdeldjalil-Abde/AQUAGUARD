# 💧 AquaGuard — Water Quality Monitoring System

## Stack
- **Backend** : Flask (Python) + scikit-learn
- **Frontend** : HTML / CSS / JavaScript + Chart.js
- **IA** : Random Forest + Régression Linéaire (sklearn)

---

## 📦 Installation

```bash
pip install flask flask-cors scikit-learn pandas numpy
```

---

## 🚀 Démarrage

```bash
# 1. Lancer le backend Flask
python app.py

# 2. Ouvrir le frontend dans le navigateur
# Ouvrir index.html directement (double-clic)
# ou via serveur local :
python -m http.server 8080
# → http://localhost:8080
```

---

## 🔌 API Endpoints

| Route | Description |
|-------|-------------|
| `GET /data` | Données capteurs + WQI + prédiction IA actuelle |
| `GET /predict` | Prédictions des 5 prochaines mesures |
| `GET /alerts` | Alertes actives (seuils WHO) |
| `GET /history` | Historique des 50 dernières lectures |
| `GET /stats` | Statistiques min/max/mean/std |

---

## 📊 Paramètres surveillés

| Paramètre | Unité | Seuil Min (WHO) | Seuil Max (WHO) |
|-----------|-------|-----------------|-----------------|
| Température | °C | 10 | 30 |
| pH | — | 6.5 | 8.5 |
| Turbidité | NTU | 0 | 4.0 |
| Conductivité | µS/cm | 50 | 500 |
| Oxygène Dissous | mg/L | 5.0 | 14 |
| SO₂ | mg/L | 0 | 0.1 |

---

## 🧠 Modèle IA

- **Algorithme principal** : Random Forest (80 arbres, profondeur max 8)
- **Algorithme secondaire** : Régression Linéaire
- **Entraînement** : 2000 échantillons synthétiques avec variation pollution
- **Sortie** : Pourcentage de pollution (0-100%)
- **Prédictions** : 5 mesures futures avec WQI et classification

---

## 🎨 Interface

- 4 pages : Dashboard · Statistiques · Prédiction IA · Alertes
- Mise à jour toutes les 3 secondes
- Indicateur WQI visuel (vert/orange/rouge)
- Alertes en temps réel avec niveaux WARNING / CRITICAL

---

## 🔮 Extensions possibles

- Connexion à des capteurs IoT réels (Raspberry Pi / Arduino)
- Base de données PostgreSQL / TimescaleDB
- Export CSV / PDF des données
- Notifications email / SMS
- Dashboard multi-barrages
