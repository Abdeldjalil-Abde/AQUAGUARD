const API = 'http://localhost:5050';

// ─── CLOCK ──────────────────────────────────
setInterval(() => {
  document.getElementById('clock').textContent =
    new Date().toLocaleTimeString('fr-FR');
}, 1000);

// ─── PAGE NAVIGATION ────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  event.currentTarget.classList.add('active');
}

// ─── CHART DEFAULTS ─────────────────────────
Chart.defaults.color = '#5a8090';
Chart.defaults.font.family = 'IBM Plex Mono';
Chart.defaults.font.size = 10;

const MAX_POINTS = 30;

function makeLineChart(canvasId, label, color, min, max) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label,
        data: [],
        borderColor: color,
        backgroundColor: color + '18',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.4,
        fill: true,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: 'rgba(0,200,240,0.04)' },
          ticks: { maxTicksLimit: 5 }
        },
        y: {
          min, max,
          grid: { color: 'rgba(0,200,240,0.07)' },
          ticks: { maxTicksLimit: 5 }
        }
      }
    }
  });
}

// ─── CHARTS INIT ────────────────────────────
const charts = {
  temp: makeLineChart('chart-temp', 'Temp', '#ff9800', 10, 40),
  ph:   makeLineChart('chart-ph',   'pH',   '#00d4ff', 5, 10),
  turb: makeLineChart('chart-turb', 'Turb', '#ce93d8', 0, 20),
  cond: makeLineChart('chart-cond', 'Cond', '#80deea', 0, 800),
  do:   makeLineChart('chart-do',   'DO',   '#00e676', 0, 14),
  so2:  makeLineChart('chart-so2',  'SO2',  '#ff5252', 0, 0.2),
};

// WQI history chart
const wqiHistCtx = document.getElementById('wqi-history-chart').getContext('2d');
const wqiHistChart = new Chart(wqiHistCtx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'WQI',
      data: [],
      borderColor: '#00d4ff',
      backgroundColor: 'rgba(0,212,255,0.06)',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.4,
      fill: true,
    }, {
      label: 'Seuil Propre (80)',
      data: [],
      borderColor: 'rgba(0,230,118,0.3)',
      borderDash: [6,4],
      borderWidth: 1,
      pointRadius: 0,
    }, {
      label: 'Seuil Pollué (50)',
      data: [],
      borderColor: 'rgba(255,61,87,0.3)',
      borderDash: [6,4],
      borderWidth: 1,
      pointRadius: 0,
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 500 },
    plugins: { legend: { display: true, labels: { boxWidth: 12 } } },
    scales: {
      x: { grid: { color: 'rgba(0,200,240,0.04)' }, ticks: { maxTicksLimit: 8 } },
      y: { min: 0, max: 100, grid: { color: 'rgba(0,200,240,0.07)' } }
    }
  }
});

// Pollution comparison chart
const pollCtx = document.getElementById('chart-pollution').getContext('2d');
const pollChart = new Chart(pollCtx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Random Forest',
      data: [],
      borderColor: '#00d4ff',
      backgroundColor: 'rgba(0,212,255,0.06)',
      borderWidth: 2, pointRadius: 0, tension: 0.4, fill: false,
    }, {
      label: 'Régression Linéaire',
      data: [],
      borderColor: '#ff9800',
      backgroundColor: 'rgba(255,152,0,0.05)',
      borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: false,
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: { legend: { display: true, labels: { boxWidth: 12 } } },
    scales: {
      x: { grid: { color: 'rgba(0,200,240,0.04)' }, ticks: { maxTicksLimit: 8 } },
      y: { min: 0, max: 100, grid: { color: 'rgba(0,200,240,0.07)' } }
    }
  }
});

// Prediction future chart
const predCtx = document.getElementById('predict-chart').getContext('2d');
const predChart = new Chart(predCtx, {
  type: 'bar',
  data: {
    labels: [],
    datasets: [{
      label: 'Pollution Prévue (%)',
      data: [],
      backgroundColor: [],
      borderWidth: 0,
      borderRadius: 2,
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 600 },
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(0,200,240,0.04)' } },
      y: { min: 0, max: 100, grid: { color: 'rgba(0,200,240,0.07)' } }
    }
  }
});

// ─── WQI RING CANVAS ────────────────────────
const wqiCanvas = document.getElementById('wqi-ring-canvas');
const wqiCtx = wqiCanvas.getContext('2d');

function drawWQIRing(value, color) {
  const cx = 70, cy = 70, r = 54;
  wqiCtx.clearRect(0, 0, 140, 140);
  // BG ring
  wqiCtx.beginPath();
  wqiCtx.arc(cx, cy, r, 0, Math.PI * 2);
  wqiCtx.strokeStyle = 'rgba(0,200,240,0.08)';
  wqiCtx.lineWidth = 8;
  wqiCtx.stroke();
  // Value ring
  const angle = (value / 100) * Math.PI * 2 - Math.PI / 2;
  wqiCtx.beginPath();
  wqiCtx.arc(cx, cy, r, -Math.PI / 2, angle);
  wqiCtx.strokeStyle = color || '#00d4ff';
  wqiCtx.lineWidth = 8;
  wqiCtx.lineCap = 'round';
  wqiCtx.stroke();
  // Glow
  wqiCtx.shadowBlur = 14;
  wqiCtx.shadowColor = color || '#00d4ff';
  wqiCtx.beginPath();
  wqiCtx.arc(cx, cy, r, -Math.PI / 2, angle);
  wqiCtx.stroke();
  wqiCtx.shadowBlur = 0;
}

// ─── SENSOR CARDS SETUP ─────────────────────
const SENSOR_CONFIG = {
  temperature: { label: 'Température', unit: '°C',    min: 10, max: 35,  icon: '🌡️', decimals: 1 },
  ph:          { label: 'pH',          unit: '',      min: 6,  max: 9,   icon: '⚗️', decimals: 2 },
  turbidity:   { label: 'Turbidité',   unit: ' NTU',  min: 0,  max: 10,  icon: '💧', decimals: 2 },
  conductivity:{ label: 'Conductivité',unit: ' µS/cm',min: 50, max: 500, icon: '⚡', decimals: 0 },
  dissolved_o2:{ label: 'Oxygène Dis.',unit: ' mg/L', min: 4,  max: 14,  icon: '🫧', decimals: 2 },
  so2:         { label: 'SO₂',         unit: ' mg/L', min: 0,  max: 0.12,icon: '🔬', decimals: 4 },
};

const THRESHOLDS = {
  ph:           { min: 6.5, max: 8.5 },
  turbidity:    { min: 0,   max: 4.0 },
  dissolved_o2: { min: 5.0, max: 14  },
  temperature:  { min: 10,  max: 30  },
  conductivity: { min: 50,  max: 500 },
  so2:          { min: 0,   max: 0.1 },
};

function buildSensorCards() {
  const grid = document.getElementById('sensor-grid');
  grid.innerHTML = '';
  Object.entries(SENSOR_CONFIG).forEach(([key, cfg]) => {
    grid.innerHTML += `
      <div class="sensor-card" id="card-${key}">
        <div class="card-corner"></div>
        <div class="card-label">${cfg.label}</div>
        <div class="card-value" id="val-${key}">—<span class="card-unit">${cfg.unit}</span></div>
        <div class="card-bar"><div class="card-bar-fill" id="bar-${key}" style="width:0%"></div></div>
        <div class="card-status" id="status-${key}">—</div>
        <div class="card-icon">${cfg.icon}</div>
      </div>`;
  });
}
buildSensorCards();

function updateSensorCard(key, value) {
  const cfg = SENSOR_CONFIG[key];
  const thr = THRESHOLDS[key];
  if (!cfg) return;

  const valEl = document.getElementById('val-' + key);
  const barEl = document.getElementById('bar-' + key);
  const statusEl = document.getElementById('status-' + key);
  const card = document.getElementById('card-' + key);
  if (!valEl) return;

  const dispVal = parseFloat(value).toFixed(cfg.decimals);
  valEl.innerHTML = `${dispVal}<span class="card-unit">${cfg.unit}</span>`;

  const pct = Math.max(0, Math.min(100, (value - cfg.min) / (cfg.max - cfg.min) * 100));
  barEl.style.width = pct + '%';

  let alertClass = '';
  let statusText = 'Normal';
  let barColor = 'linear-gradient(90deg, var(--teal), var(--cyan))';

  if (thr) {
    if (value < thr.min || value > thr.max) {
      const isViolation = value < thr.min * 0.8 || value > thr.max * 1.2;
      alertClass = isViolation ? 'alert-crit' : 'alert-warn';
      statusText = isViolation ? '⚠ CRITIQUE' : '⚠ Hors seuil';
      barColor = isViolation
        ? 'linear-gradient(90deg, #ff1744, #ff3d57)'
        : 'linear-gradient(90deg, #ff8f00, #ffab00)';
      valEl.style.color = isViolation ? 'var(--danger)' : 'var(--warn)';
    } else {
      valEl.style.color = 'var(--cyan)';
    }
  }

  barEl.style.background = barColor;
  card.className = 'sensor-card' + (alertClass ? ' ' + alertClass : '');
  statusEl.textContent = statusText;
}

// ─── SUB SCORES ─────────────────────────────
const PARAM_LABELS = {
  ph:'pH', turbidity:'Turbidité', dissolved_o2:'DO',
  conductivity:'Conductivité', temperature:'Temp.', so2:'SO₂'
};

function updateSubScores(subScores) {
  const grid = document.getElementById('sub-scores-grid');
  grid.innerHTML = Object.entries(subScores).map(([k, v]) => {
    const color = v >= 80 ? 'var(--safe)' : v >= 50 ? 'var(--warn)' : 'var(--danger)';
    return `<div class="sub-score-item">
      <div class="ss-label">${PARAM_LABELS[k] || k}</div>
      <div class="ss-value" style="color:${color}">${v}</div>
      <div class="ss-bar"><div class="ss-bar-fill" style="width:${v}%;background:${color}"></div></div>
    </div>`;
  }).join('');
}

// ─── CHART HELPERS ──────────────────────────
function pushData(chart, label, ...values) {
  chart.data.labels.push(label);
  values.forEach((v, i) => chart.data.datasets[i].data.push(v));
  if (chart.data.labels.length > MAX_POINTS) {
    chart.data.labels.shift();
    chart.data.datasets.forEach(ds => ds.data.shift());
  }
  chart.update('none');
}

// ─── ALERTS RENDER ──────────────────────────
let allAlerts = [];

function renderAlerts(alerts) {
  allAlerts = alerts;
  const count = alerts.length;
  document.getElementById('alert-count').textContent = count;
  const navBadge = document.getElementById('nav-alert-count');
  if (count > 0) {
    navBadge.textContent = count;
    navBadge.style.display = 'inline';
  } else {
    navBadge.style.display = 'none';
  }

  const list = document.getElementById('alert-list');
  if (count === 0) {
    list.innerHTML = `<div class="no-alerts"><span class="no-alerts-icon">✓</span>Aucune alerte — Qualité nominale</div>`;
  } else {
    list.innerHTML = alerts.map(a => `
      <div class="alert-item severity-${a.severity}">
        <div class="alert-icon">${a.severity === 'CRITICAL' ? '🔴' : '🟡'}</div>
        <div class="alert-body">
          <div class="alert-msg">${a.message}</div>
          <div class="alert-meta">${new Date(a.timestamp).toLocaleTimeString('fr-FR')} · ${a.param}</div>
        </div>
        <div class="alert-badge ${a.severity}">${a.severity}</div>
      </div>`).join('');
    document.getElementById('alert-ts').textContent =
      'Dernière mise à jour: ' + new Date().toLocaleTimeString('fr-FR');
  }
}

// ─── MAIN FETCH LOOP ─────────────────────────
let fetchOk = true;
let tickCount = 0;

async function fetchData() {
  try {
    const res = await fetch(API + '/data');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json();
    fetchOk = true;
    document.getElementById('sb-status').textContent = '● En ligne';
    document.getElementById('sb-status').style.color = 'var(--safe)';

    const s = d.sensors;
    const ts = new Date(s.timestamp).toLocaleTimeString('fr-FR');
    tickCount++;

    // Update sensor cards
    Object.keys(SENSOR_CONFIG).forEach(k => {
      if (s[k] !== undefined) updateSensorCard(k, s[k]);
    });

    // WQI
    const wqi = d.wqi;
    document.getElementById('wqi-number').textContent = wqi.wqi;
    document.getElementById('wqi-number').style.color = wqi.color;
    const cls = document.getElementById('wqi-class');
    cls.textContent = wqi.classification === 'CLEAN' ? '✓ EAU PROPRE'
                    : wqi.classification === 'MODERATE' ? '◈ QUALITÉ MOYENNE'
                    : '✕ EAU POLLUÉE';
    cls.className = 'wqi-class ' + wqi.classification.toLowerCase();
    drawWQIRing(wqi.wqi, wqi.color);
    if (wqi.sub_scores) updateSubScores(wqi.sub_scores);

    // Status bar
    document.getElementById('sb-wqi').textContent = wqi.wqi;
    document.getElementById('sb-wqi').style.color = wqi.color;

    const avgPoll = d.pollution.average;
    const sbPoll = document.getElementById('sb-pollution');
    sbPoll.textContent = avgPoll.toFixed(1) + '%';
    sbPoll.style.color = avgPoll > 50 ? 'var(--danger)' : avgPoll > 20 ? 'var(--warn)' : 'var(--safe)';

    // Charts
    pushData(charts.temp, ts, s.temperature);
    pushData(charts.ph,   ts, s.ph);
    pushData(charts.turb, ts, s.turbidity);
    pushData(charts.cond, ts, s.conductivity);
    pushData(charts.do,   ts, s.dissolved_o2);
    pushData(charts.so2,  ts, s.so2);
    pushData(pollChart, ts, d.pollution.random_forest, d.pollution.linear_regression);

    // WQI history
    wqiHistChart.data.labels.push(ts);
    wqiHistChart.data.datasets[0].data.push(wqi.wqi);
    wqiHistChart.data.datasets[1].data.push(80);
    wqiHistChart.data.datasets[2].data.push(50);
    if (wqiHistChart.data.labels.length > MAX_POINTS) {
      wqiHistChart.data.labels.shift();
      wqiHistChart.data.datasets.forEach(ds => ds.data.shift());
    }
    wqiHistChart.update('none');

    // Alerts
    renderAlerts(d.alerts);

  } catch(e) {
    if (fetchOk) {
      fetchOk = false;
      document.getElementById('sb-status').textContent = '✕ Hors ligne — démarrez app.py';
      document.getElementById('sb-status').style.color = 'var(--danger)';
    }
  }
}

// ─── PREDICTION FETCH ────────────────────────
async function fetchPrediction() {
  try {
    const res = await fetch(API + '/predict');
    if (!res.ok) return;
    const d = await res.json();
    if (!d.predictions || d.predictions.length === 0) return;

    // Table
    const tbody = document.getElementById('predict-tbody');
    tbody.innerHTML = d.predictions.map(p => {
      const cls = p.classification.toLowerCase();
      const pollColor = p.pollution_pct > 50 ? 'var(--danger)' : p.pollution_pct > 20 ? 'var(--warn)' : 'var(--safe)';
      return `<tr>
        <td style="color:var(--muted)">+${p.step}</td>
        <td>${p.values.ph?.toFixed(2)}</td>
        <td>${p.values.temperature?.toFixed(1)}</td>
        <td>${p.values.turbidity?.toFixed(2)}</td>
        <td style="color:${pollColor};font-weight:600">${p.pollution_pct}%</td>
        <td>${p.wqi}</td>
        <td><span class="badge ${cls}">${p.classification}</span></td>
      </tr>`;
    }).join('');

    // Bar chart
    predChart.data.labels = d.predictions.map(p => '+' + p.step);
    predChart.data.datasets[0].data = d.predictions.map(p => p.pollution_pct);
    predChart.data.datasets[0].backgroundColor = d.predictions.map(p =>
      p.pollution_pct > 50 ? 'rgba(255,61,87,0.7)'
      : p.pollution_pct > 20 ? 'rgba(255,171,0,0.7)'
      : 'rgba(0,230,118,0.7)'
    );
    predChart.update();

    // Feature importance
    if (d.feature_importance) {
      const entries = Object.entries(d.feature_importance).sort((a,b) => b[1]-a[1]);
      const labels = {
        temperature:'Température', ph:'pH', turbidity:'Turbidité',
        conductivity:'Conductivité', dissolved_o2:'Oxygène Dis.', so2:'SO₂'
      };
      document.getElementById('importance-bars').innerHTML = entries.map(([k,v]) => `
        <div class="imp-row">
          <div class="imp-label">${labels[k]||k}</div>
          <div class="imp-bar-wrap"><div class="imp-bar-fill" style="width:${v}%"></div></div>
          <div class="imp-pct">${v}%</div>
        </div>`).join('');
    }
  } catch(e) {}
}

// ─── ALERT TABS ──────────────────────────────
let activeAlertTab = 'active';

function switchAlertTab(tab, btn) {
  activeAlertTab = tab;
  document.querySelectorAll('.alert-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('panel-active').style.display  = tab === 'active'  ? '' : 'none';
  document.getElementById('panel-history').style.display = tab === 'history' ? '' : 'none';
  if (tab === 'history') loadAlertHistory(true);
}

// ─── ALERT HISTORY FETCH ─────────────────────
let histOffset = 0;
const HIST_PAGE = 30;

async function loadAlertHistory(reset = false) {
  if (reset) histOffset = 0;
  const severity = document.getElementById('hist-severity').value;
  const param    = document.getElementById('hist-param').value;

  let url = `${API}/alerts/history?limit=${HIST_PAGE}&offset=${histOffset}`;
  if (severity) url += `&severity=${encodeURIComponent(severity)}`;
  if (param)    url += `&param=${encodeURIComponent(param)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const d = await res.json();

    document.getElementById('hist-total-label').textContent = `${d.total} entrée${d.total !== 1 ? 's' : ''}`;

    const list = document.getElementById('alert-history-list');
    if (d.total === 0) {
      list.innerHTML = `<div class="no-alerts"><span class="no-alerts-icon">◷</span>Aucune alerte enregistrée</div>`;
      document.getElementById('hist-load-more').style.display = 'none';
      return;
    }

    const html = d.history.map(a => {
      const resolvedBadge = a.resolved
        ? `<span class="resolved-badge">✓ Résolu ${a.resolved_at ? new Date(a.resolved_at).toLocaleTimeString('fr-FR') : ''}</span>`
        : '';
      return `<div class="alert-item severity-${a.severity}${a.resolved ? ' resolved' : ''}">
        <div class="alert-icon">${a.severity === 'CRITICAL' ? '🔴' : '🟡'}</div>
        <div class="alert-body">
          <div class="alert-msg">${a.message}</div>
          <div class="alert-meta">${new Date(a.timestamp).toLocaleString('fr-FR')} · ${a.param}</div>
          ${resolvedBadge}
        </div>
        <div class="alert-badge ${a.severity}">${a.severity}</div>
      </div>`;
    }).join('');

    if (reset) {
      list.innerHTML = html;
    } else {
      list.insertAdjacentHTML('beforeend', html);
    }

    histOffset += d.history.length;
    const loadMoreBtn = document.getElementById('hist-load-more');
    loadMoreBtn.style.display = d.has_more ? 'block' : 'none';
    loadMoreBtn.disabled = false;
  } catch(e) {}
}

function loadMoreHistory() {
  const btn = document.getElementById('hist-load-more');
  btn.disabled = true;
  btn.textContent = 'Chargement…';
  loadAlertHistory(false).then(() => { btn.textContent = 'Charger plus…'; });
}

// ─── KICK OFF ───────────────────────────────
fetchData();
fetchPrediction();
setInterval(fetchData, 3000);
setInterval(fetchPrediction, 9000);
