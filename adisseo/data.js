// ── Adisseo / Dynamica Methionine Pricing Cockpit — Seed Data ──
// Illustrative data only. Hierarchy: Global → Region → Country → Product.
// Prices are per metric tonne: EUR/t in Europe, USD/t elsewhere.

// Demo "today" — history and forecast are anchored here (ISO week 39).
const DEMO_TODAY = new Date(2026, 8, 21); // 21 Sep 2026

// ── Seeded RNG (stable across reloads) ───────────────────────
function _hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function _mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngFor(key) { return _mulberry32(_hashStr(key)); }
function rpick(rng, lo, hi) { return lo + rng() * (hi - lo); }
function rpickInt(rng, lo, hi) { return Math.round(rpick(rng, lo, hi)); }

// ── Products ─────────────────────────────────────────────────
// Liquid methionine (MHA-FA, 88%) is priced below powder (DL-Met, 99%)
// on a per-tonne basis; both track the same market cycle.
const PRODUCTS = [
  { id: 'POW', name: 'Met Powder',        spec: 'DL-Methionine 99%', priceMult: 1.00, costMult: 1.00 },
  { id: 'LIQ', name: 'Liquid Methionine', spec: 'MHA-FA 88%',        priceMult: 0.80, costMult: 0.82 },
];
const PRODUCT_NAMES = PRODUCTS.map(p => p.name);

// ── Regions & countries (markets) ────────────────────────────
// basePow = reference Met Powder price /t in the region currency;
// strengthBias tilts the market-strength signal for the country.
const REGIONS = [
  { id: 'EU', name: 'Europe',   cur: 'EUR', sym: '€' },
  { id: 'AS', name: 'Asia',     cur: 'USD', sym: '$' },
  { id: 'AM', name: 'Americas', cur: 'USD', sym: '$' },
];

const _COUNTRIES_RAW = [
  { id: 'DE', name: 'Germany',  region: 'EU', pm: 'Claire Dubois',   basePow: 2380, baseCost: 1620, strengthBias:  0.35, volume: 2600 },
  { id: 'FR', name: 'France',   region: 'EU', pm: 'Claire Dubois',   basePow: 2360, baseCost: 1610, strengthBias:  0.25, volume: 2100 },
  { id: 'ES', name: 'Spain',    region: 'EU', pm: 'Claire Dubois',   basePow: 2340, baseCost: 1625, strengthBias:  0.10, volume: 1800 },
  { id: 'PL', name: 'Poland',   region: 'EU', pm: 'Marek Nowak',     basePow: 2310, baseCost: 1635, strengthBias: -0.15, volume: 1500 },
  { id: 'CN', name: 'China',    region: 'AS', pm: 'Li Wei',          basePow: 2050, baseCost: 1580, strengthBias: -0.60, volume: 4200 },
  { id: 'VN', name: 'Vietnam',  region: 'AS', pm: 'Li Wei',          basePow: 2180, baseCost: 1600, strengthBias:  0.20, volume: 1300 },
  { id: 'TH', name: 'Thailand', region: 'AS', pm: 'Li Wei',          basePow: 2200, baseCost: 1605, strengthBias:  0.05, volume: 1100 },
  { id: 'IN', name: 'India',    region: 'AS', pm: 'Priya Raman',     basePow: 2120, baseCost: 1595, strengthBias:  0.30, volume: 1700 },
  { id: 'BR', name: 'Brazil',   region: 'AM', pm: 'Rafael Costa',    basePow: 2320, baseCost: 1640, strengthBias:  0.55, volume: 2900 },
  { id: 'US', name: 'USA',      region: 'AM', pm: 'Rafael Costa',    basePow: 2420, baseCost: 1650, strengthBias: -0.10, volume: 2400 },
  { id: 'MX', name: 'Mexico',   region: 'AM', pm: 'Rafael Costa',    basePow: 2380, baseCost: 1645, strengthBias: -0.40, volume: 1200 },
];

const PRICING_MANAGERS = [...new Set(_COUNTRIES_RAW.map(c => c.pm))];

// ── Market signal levels (drives the price guidance) ─────────
// The score (0-100) is derived from the strength signal below; the
// level is what the cockpit shows and explains.
const SIGNAL_LEVELS = {
  5: { level: 5, code: 'S5', label: 'Strengthening fast', short: 'Strong ↑',  interp: 'Benchmarks rising, demand ahead of plan, tight supply' },
  4: { level: 4, code: 'S4', label: 'Strengthening',      short: 'Firming',        interp: 'Benchmarks edging up, demand above plan' },
  3: { level: 3, code: 'S3', label: 'Stable',             short: 'Stable',         interp: 'Benchmarks flat, demand in line with plan' },
  2: { level: 2, code: 'S2', label: 'Softening',          short: 'Softening',      interp: 'Benchmarks easing, demand below plan' },
  1: { level: 1, code: 'S1', label: 'Softening fast',     short: 'Weak ↓',    interp: 'Benchmarks falling, demand well below plan, spare capacity' },
};
function signalPpt(score) { return Math.round((score - 50) * 0.5); }
function signalLevelFor(ppt) {
  if (ppt >= 12)  return SIGNAL_LEVELS[5];
  if (ppt >= 5)   return SIGNAL_LEVELS[4];
  if (ppt >= -5)  return SIGNAL_LEVELS[3];
  if (ppt >= -12) return SIGNAL_LEVELS[2];
  return SIGNAL_LEVELS[1];
}
function signalLevelForScore(score) { return signalLevelFor(signalPpt(score)); }

// ── Notes pool ───────────────────────────────────────────────
const NOTE_TEXTS = [
  'Hold pending Q4 contract negotiation',
  'Key account volume commitment — do not move',
  'Tender submitted at current level',
  'Import duty change expected in November',
  'Competitor plant outage — supply tight',
  'Freight surcharge under review',
  'Aligned with regional list price',
];
function makeNote(rng) {
  if (rng() > 0.3) return null;
  const text = NOTE_TEXTS[Math.floor(rng() * NOTE_TEXTS.length)];
  const d = new Date(DEMO_TODAY);
  d.setDate(d.getDate() + Math.floor(rng() * 60) + 7);
  const expires = String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getFullYear()).slice(-2);
  return { text, expires };
}

// ── Product-market factory ───────────────────────────────────
// One seeded "market strength" signal (−1..+1) per product-market drives
// every indicator so the cockpit always tells one story: benchmark
// trend, demand momentum, capacity utilization, the forecast and the
// resulting price guidance all move together.
function makeProductMarket(country, region, product) {
  const id = country.id + '-' + product.id;
  const r = rngFor('pm|' + id);
  const strength = Math.max(-1, Math.min(1, country.strengthBias * 1.5 + rpick(r, -0.22, 0.22)));

  const price   = Math.round(country.basePow * product.priceMult / 5) * 5;
  const varCost = Math.round(country.baseCost * product.costMult / 5) * 5;

  // Published benchmarks sit around Adisseo's price; Boyar reads a touch
  // below Feedinfo in most markets.
  const feedinfo = Math.round(price * (1 + strength * 0.03 + rpick(r, -0.012, 0.012)) / 5) * 5;
  const boyar    = Math.round(feedinfo * (1 - 0.008 + rpick(r, -0.01, 0.006)) / 5) * 5;

  // 4-week benchmark move (%) — the "significant market movement" signal
  const benchMove4w = Math.round((strength * 7.5 + rpick(r, -1.0, 1.0)) * 10) / 10;

  // Demand momentum vs plan (%), order intake vs plan (t/month)
  const momentum = Math.round((strength * 14 + rpick(r, -3, 3)) * 10) / 10;
  const planIntake = Math.round(country.volume * (product.id === 'POW' ? 0.65 : 0.35) / 10) * 10;
  const intake = Math.round(planIntake * (1 + momentum / 100) * rpick(r, 0.97, 1.03));

  // Capacity utilization (%): tight when the market is strong
  const capUtil = Math.max(60, Math.min(99, Math.round(84 + strength * 12 + rpick(r, -3, 3))));

  // Variable cost trend (%, 4-week) — mostly independent, mild
  const costMove4w = Math.round(rpick(r, -1.5, 3.5) * 10) / 10;

  // Market price forecast (8 weeks ahead) around the blended benchmark
  const blended  = Math.round((feedinfo * 0.6 + boyar * 0.4));
  const fcst8w   = Math.round(blended * (1 + strength * 0.045 + rpick(r, -0.006, 0.006)) / 5) * 5;

  // Market signal score 0-100 from strength
  const signal = Math.max(5, Math.min(97, Math.round(50 + strength * 36 + rpick(r, -3, 3))));

  // ── Price guidance (rules-driven): pull toward the forecast, respect the
  //    cost floor, widen when volatile ──
  const lvl = signalLevelForScore(signal).level;
  let mid = price;
  if      (lvl === 5) mid = price * rpick(r, 1.035, 1.06);
  else if (lvl === 4) mid = price * rpick(r, 1.015, 1.035);
  else if (lvl === 2) mid = price * rpick(r, 0.97, 0.985);
  else if (lvl === 1) mid = price * rpick(r, 0.94, 0.965);
  const floor = varCost * 1.18;                     // minimum contribution margin
  mid = Math.max(mid, floor);
  mid = Math.round(mid / 5) * 5;
  const halfWidth = Math.round(mid * (0.02 + Math.abs(benchMove4w) * 0.002) / 5) * 5;
  const corridorLow  = mid - halfWidth;
  const corridorHigh = mid + halfWidth;
  const pctChange = Math.round(((mid - price) / price) * 1000) / 10;

  return {
    id,
    countryId: country.id, regionId: region.id, cur: region.cur, sym: region.sym,
    productId: product.id, product: product.name, spec: product.spec,
    strength, signal,
    price, rec: mid, corridorLow, corridorHigh, pctChange,
    feedinfo, boyar, blended, fcst8w, benchMove4w,
    varCost, costMove4w,
    capUtil, momentum, intake, planIntake,
    volume: planIntake,
    lock: null,
    note: makeNote(r),
    lastYearPrice: Math.round(price * (1 - strength * 0.05 + rpick(r, -0.03, 0.03)) / 5) * 5,
  };
}

// ── Explanation drivers (kept from Dynamica explainability) ──
function guidanceDrivers(pm) {
  const d = [];
  const up = pm.rec > pm.price, down = pm.rec < pm.price;
  if (pm.benchMove4w >= 2)       d.push({ dir: 'up',   text: 'Market benchmark increasing — Feedinfo +' + pm.benchMove4w + '% over 4 weeks' });
  else if (pm.benchMove4w <= -2) d.push({ dir: 'down', text: 'Market benchmark easing — Feedinfo ' + pm.benchMove4w + '% over 4 weeks' });
  else                           d.push({ dir: 'flat', text: 'Market benchmark flat (' + (pm.benchMove4w > 0 ? '+' : '') + pm.benchMove4w + '% over 4 weeks)' });
  if (pm.capUtil >= 90)          d.push({ dir: 'up',   text: 'Capacity utilization high at ' + pm.capUtil + '% — limited spare supply' });
  else if (pm.capUtil >= 86)     d.push({ dir: 'up',   text: 'Capacity utilization elevated at ' + pm.capUtil + '% — supply tightening' });
  else if (pm.capUtil <= 76)     d.push({ dir: 'down', text: 'Capacity utilization low at ' + pm.capUtil + '% — spare supply available' });
  if (pm.momentum >= 3)          d.push({ dir: 'up',   text: 'Regional demand strengthening — order intake +' + pm.momentum + '% vs plan' });
  else if (pm.momentum <= -3)    d.push({ dir: 'down', text: 'Regional demand softening — order intake ' + pm.momentum + '% vs plan' });
  else                           d.push({ dir: 'flat', text: 'Regional demand in line with plan (' + (pm.momentum > 0 ? '+' : '') + pm.momentum + '%)' });
  if (pm.costMove4w >= 2)        d.push({ dir: 'up',   text: 'Variable costs increasing (+' + pm.costMove4w + '%) — margin protection' });
  const gapToBench = Math.round((pm.price - pm.blended) / pm.blended * 1000) / 10;
  if (gapToBench >= 2)           d.push({ dir: 'down', text: 'Current price ' + gapToBench + '% above blended benchmark' });
  else if (gapToBench <= -2)     d.push({ dir: 'up',   text: 'Current price ' + Math.abs(gapToBench) + '% below blended benchmark' });
  if (pm.rec <= Math.round(pm.varCost * 1.18 / 5) * 5 + 5 && down) d.push({ dir: 'flat', text: 'Guidance held at contribution-margin floor (variable cost + 18%)' });
  return d;
}

// ── Alerts ───────────────────────────────────────────────────
const ALERT_DEFAULTS = {
  marketMove: { enabled: true, threshold: 5 },    // |benchmark move 4w| >= %
  capUtil:    { enabled: true, threshold: 90 },   // capacity utilization > %
  corridor:   { enabled: true },                  // current price outside forecast corridor
};

const ALERT_META = {
  marketMove: { label: 'Significant market movement', color: '#ea580c' },
  capUtil:    { label: 'Capacity utilization >90%',   color: '#dc2626' },
  corridor:   { label: 'Price outside corridor',      color: '#2563eb' },
};
const ALERT_ORDER = ['marketMove', 'capUtil', 'corridor'];

function makeAlert(type, tooltip, isRollup) {
  return { type, tooltip, isRollup: !!isRollup, label: ALERT_META[type].label, color: ALERT_META[type].color };
}

// Alerts for a metrics object — a product-market or an aggregate.
function computeAlerts(m, cfg) {
  cfg = cfg || ALERT_DEFAULTS;
  const out = [];
  if (cfg.marketMove.enabled && Math.abs(m.benchMove4w) >= cfg.marketMove.threshold) {
    out.push(makeAlert('marketMove', 'Significant market movement: Feedinfo ' + (m.benchMove4w > 0 ? '+' : '') + m.benchMove4w + '% over 4 weeks (threshold ±' + cfg.marketMove.threshold + '%)'));
  }
  if (cfg.capUtil.enabled && m.capUtil > cfg.capUtil.threshold) {
    out.push(makeAlert('capUtil', 'Capacity utilization ' + m.capUtil + '% (threshold ' + cfg.capUtil.threshold + '%)'));
  }
  if (cfg.corridor.enabled && m.corridorLow != null && (m.price < m.corridorLow || m.price > m.corridorHigh)) {
    out.push(makeAlert('corridor', 'Current price ' + (m.price < m.corridorLow ? 'below' : 'above') + ' the expected corridor (' + m.sym + m.corridorLow.toLocaleString('en-GB') + '–' + m.sym + m.corridorHigh.toLocaleString('en-GB') + '/t)'));
  }
  return out;
}

function unionAlerts(directAlerts, childMetricsList, cfg) {
  const byType = new Map();
  directAlerts.forEach(a => byType.set(a.type, a));
  const descendantCount = {};
  (childMetricsList || []).forEach(m => {
    computeAlerts(m, cfg).forEach(a => {
      descendantCount[a.type] = (descendantCount[a.type] || 0) + 1;
    });
  });
  Object.keys(descendantCount).forEach(type => {
    if (byType.has(type)) return;
    byType.set(type, makeAlert(type,
      ALERT_META[type].label + ': ' + descendantCount[type] + ' product-market' + (descendantCount[type] === 1 ? '' : 's'), true));
  });
  const out = [];
  ALERT_ORDER.forEach(t => { if (byType.has(t)) out.push(byType.get(t)); });
  return out;
}

// ── Aggregation helpers (volume-weighted) ────────────────────
function aggregateMetrics(list) {
  const vol = list.reduce((s, x) => s + x.volume, 0) || 1;
  const w = (k) => Math.round(list.reduce((s, x) => s + x[k] * x.volume, 0) / vol);
  const w1 = (k) => Math.round(list.reduce((s, x) => s + x[k] * x.volume, 0) / vol * 10) / 10;
  const intake = list.reduce((s, x) => s + x.intake, 0);
  const planIntake = list.reduce((s, x) => s + x.planIntake, 0);
  return {
    volume: vol,
    price: w('price'), rec: w('rec'), feedinfo: w('feedinfo'), boyar: w('boyar'), blended: w('blended'),
    varCost: w('varCost'), capUtil: w('capUtil'), signal: w('signal'),
    momentum: w1('momentum'), benchMove4w: w1('benchMove4w'), costMove4w: w1('costMove4w'),
    intake, planIntake,
    corridorLow: null, corridorHigh: null,
    fcst8w: w('fcst8w'),
    lastYearPrice: w('lastYearPrice'),
  };
}

// ── Portfolio assembly ───────────────────────────────────────
const PRICING_DATA = REGIONS.map(region => {
  const countries = _COUNTRIES_RAW.filter(c => c.region === region.id).map(c => {
    const products = PRODUCTS.map(p => makeProductMarket(c, region, p));
    const agg = aggregateMetrics(products);
    return { ...c, cur: region.cur, sym: region.sym, regionName: region.name, products, ...agg, note: null };
  });
  const all = countries.flatMap(c => c.products);
  const agg = aggregateMetrics(all);
  return { ...region, countries, ...agg };
});

const COUNTRIES = PRICING_DATA.flatMap(r => r.countries);

function findProductMarket(id) {
  for (const region of PRICING_DATA) {
    for (const country of region.countries) {
      const pm = country.products.find(p => p.id === id);
      if (pm) return { pm, country, region };
    }
  }
  return null;
}

// ── Price lock helpers (session-only) ────────────────────────
function expireStaleLocks() {
  const now = Date.now();
  PRICING_DATA.forEach(r => r.countries.forEach(c => c.products.forEach(p => {
    if (p.lock && p.lock.locked && p.lock.lockUntil && Date.parse(p.lock.lockUntil) <= now) p.lock = null;
  })));
}
function applyLock(id, untilDate, reason) {
  const f = findProductMarket(id);
  if (!f) return null;
  const prev = f.pm.lock;
  f.pm.lock = {
    locked: true,
    lockUntil: untilDate ? untilDate.toISOString() : null,
    lockedPrice: prev?.lockedPrice ?? f.pm.rec,
    reason: reason || null,
    lockedAt: prev?.lockedAt ?? new Date().toISOString(),
  };
  return f.pm.lock;
}
function clearLock(id) {
  const f = findProductMarket(id);
  if (f) f.pm.lock = null;
}
(function _seedLocks() {
  const daysOut = n => new Date(Date.now() + n * 864e5);
  [
    { id: 'FR-POW', until: daysOut(30), reason: 'Q4 key-account contract under negotiation' },
    { id: 'US-LIQ', until: null,        reason: 'Annual contract price — fixed until January' },
  ].forEach(({ id, until, reason }) => {
    const f = findProductMarket(id);
    if (!f) return;
    f.pm.lock = { locked: true, lockUntil: until ? until.toISOString() : null, lockedPrice: f.pm.rec, reason, lockedAt: new Date().toISOString() };
  });
})();

// ── Market price forecast series (per product-market or aggregate) ──
// 26 weeks of history (Feedinfo, Boyar, Adisseo price) + 8-week forecast
// with a corridor, plus 8 weeks of order intake vs plan. Seeded so the
// modal is stable across opens.
function marketForecastData(seedKey, m) {
  const r = rngFor('fc|' + seedKey);
  const H = 26, F = 8;
  const strength = m.strength != null ? m.strength : (m.signal - 50) / 32;

  // Walk the benchmark backwards from today's value so the last point
  // equals the current Feedinfo quote and the 4-week move matches.
  const feedinfo = new Array(H);
  feedinfo[H - 1] = m.feedinfo;
  const weeklyDrift = (m.benchMove4w / 100) / 4;
  for (let i = H - 2; i >= 0; i--) {
    const drift = i >= H - 5 ? weeklyDrift : weeklyDrift * 0.35 + rpick(r, -0.004, 0.004);
    feedinfo[i] = feedinfo[i + 1] / (1 + drift + rpick(r, -0.005, 0.005));
  }
  const boyar = feedinfo.map((v, i) => v * (m.boyar / m.feedinfo) * (1 + rpick(r, -0.004, 0.004)));
  // Adisseo price steps: held for stretches, re-set every ~6 weeks
  const price = new Array(H);
  let p = m.lastYearPrice * (1 + rpick(r, 0.0, 0.02));
  for (let i = 0; i < H; i++) {
    if (i % 6 === 0 && i > 0) p = Math.round((p * 0.5 + feedinfo[i] * 0.5) / 5) * 5;
    price[i] = p;
  }
  price[H - 1] = m.price;
  if (H >= 2) price[H - 2] = m.price;

  // Forecast: glide from the blended benchmark to fcst8w; corridor widens out
  const start = m.blended;
  const fcMid = [], fcLow = [], fcHigh = [];
  for (let k = 1; k <= F; k++) {
    const t = k / F;
    const mid = start + (m.fcst8w - start) * (1 - Math.pow(1 - t, 1.6));
    const width = mid * (0.012 + 0.03 * t);
    fcMid.push(mid); fcLow.push(mid - width); fcHigh.push(mid + width);
  }

  // Week labels
  const labels = [];
  for (let i = 0; i < H + F; i++) {
    const d = new Date(DEMO_TODAY.getTime() + (i - (H - 1)) * 7 * 86400000);
    labels.push({
      offset: i - (H - 1),
      short: d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()],
    });
  }

  // Order intake per week (t) vs plan, last 8 weeks — follows momentum
  const wk = [];
  const weeklyPlan = Math.max(10, Math.round(m.planIntake / 4.33));
  const planRng = rngFor('fcplan|' + seedKey);
  const intakePlan = Array.from({ length: 8 }, () => Math.round(weeklyPlan * rpick(planRng, 0.9, 1.1)));
  const intakeAct = intakePlan.map(b => Math.max(0, Math.round(b * (1 + m.momentum / 100) * rpick(r, 0.85, 1.15))));
  for (let i = 7; i >= 0; i--) {
    const d = new Date(DEMO_TODAY.getTime() - i * 7 * 86400000);
    wk.push({ num: d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] });
  }

  return {
    H, F, labels,
    feedinfo: feedinfo.map(v => Math.round(v)),
    boyar: boyar.map(v => Math.round(v)),
    price: price.map(v => Math.round(v)),
    fcMid: fcMid.map(v => Math.round(v)), fcLow: fcLow.map(v => Math.round(v)), fcHigh: fcHigh.map(v => Math.round(v)),
    weekLabels: wk, intakeAct, intakePlan,
  };
}

// ── Parameters ───────────────────────────────────────────────
const PARAM_DEFAULTS = {
  maxPriceChange: 6, minPriceChange: -6,
  corridorWidthPct: 2.5,        // ± around guidance
  costFloorMarginPct: 18,       // contribution margin over variable cost
  feedinfoWeightPct: 60,        // blended benchmark weighting (rest = Boyar)
  marketMoveAlertPct: 5,        // |4-week benchmark move|
  capUtilAlertPct: 90,          // capacity utilization
  reviewCadenceDays: 7,
};
const PARAMETERS_DATA = COUNTRIES.map(c => ({
  ...c,
  params: { ...PARAM_DEFAULTS },
  bedTypes: PRODUCTS.map(p => ({ type: p.name, params: { ...PARAM_DEFAULTS } })),
}));

// ── Panel chart helpers ──────────────────────────────────────
const CHART_MONTHS = ['Oct 25','Nov 25','Dec 25','Jan 26','Feb 26','Mar 26','Apr 26','May 26','Jun 26','Jul 26','Aug 26','Sep 26'];
