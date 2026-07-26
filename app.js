/* ═══════════════════════════════════════════════════════════════
   Генератор карток лото — логіка
   Правила (не змінювати): 3×9, 15 чисел, по 5 у рядку,
   стовпці = діапазони 1-9 … 80-90, 4 набори по 6 карток,
   у кожному наборі числа 1-90 без повторів.
   ═══════════════════════════════════════════════════════════════ */

const SETS = 4;
const CARDS_PER_SET = 6;
const COLS = 9;
const ROWS = 3;

const colRange = (c) => (c === 0 ? [1, 9] : c === 8 ? [80, 90] : [c * 10, c * 10 + 9]);
const colSize = (c) => (c === 0 ? 9 : c === 8 ? 11 : 10);

const rnd = (n) => Math.floor(Math.random() * n);
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* Матриця кількостей: 6 карток × 9 стовпців.
   Сума по стовпцю = розмір діапазону, сума по картці = 15, клітинка ≤ 3. */
function countsMatrix() {
  for (let attempt = 0; attempt < 500; attempt++) {
    const m = Array.from({ length: CARDS_PER_SET }, () => Array(COLS).fill(1));
    const cardTotal = Array(CARDS_PER_SET).fill(COLS);
    const colLeft = Array.from({ length: COLS }, (_, c) => colSize(c) - CARDS_PER_SET);
    let ok = true;
    let left = colLeft.reduce((s, v) => s + v, 0);
    while (left > 0) {
      const cols = shuffle([...Array(COLS).keys()].filter((c) => colLeft[c] > 0));
      let placed = false;
      for (const c of cols) {
        const cards = shuffle([...Array(CARDS_PER_SET).keys()].filter((i) => m[i][c] < 3 && cardTotal[i] < 15));
        if (!cards.length) continue;
        const i = cards[0];
        m[i][c]++; cardTotal[i]++; colLeft[c]--; left--; placed = true;
        break;
      }
      if (!placed) { ok = false; break; }
    }
    if (ok && cardTotal.every((t) => t === 15)) return m;
  }
  throw new Error('Не вдалося розподілити числа');
}

/* Розкладка стовпців картки по рядках: рівно 5 у кожному рядку. */
function rowLayout(counts) {
  for (let attempt = 0; attempt < 800; attempt++) {
    const rowsLeft = [5, 5, 5];
    const layout = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const order = shuffle([...Array(COLS).keys()]).sort((a, b) => counts[b] - counts[a]);
    let ok = true;
    for (const c of order) {
      const picks = shuffle([0, 1, 2].filter((r) => rowsLeft[r] > 0)).slice(0, counts[c]);
      if (picks.length < counts[c]) { ok = false; break; }
      for (const r of picks) { layout[r][c] = true; rowsLeft[r]--; }
    }
    if (ok && rowsLeft.every((v) => v === 0)) return layout;
  }
  throw new Error('Не вдалося розкласти рядки');
}

function generateSet() {
  const counts = countsMatrix();
  const pools = Array.from({ length: COLS }, (_, c) => {
    const [a, b] = colRange(c);
    return shuffle(Array.from({ length: b - a + 1 }, (_, i) => a + i));
  });
  return counts.map((cardCounts) => {
    const layout = rowLayout(cardCounts);
    const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    for (let c = 0; c < COLS; c++) {
      const take = pools[c].splice(0, cardCounts[c]).sort((a, b) => a - b);
      let k = 0;
      for (let r = 0; r < ROWS; r++) if (layout[r][c]) grid[r][c] = take[k++];
    }
    return grid;
  });
}

function generateAll() {
  return Array.from({ length: SETS }, () => generateSet());
}

/* ── рендер ─────────────────────────────────────────────── */
const ROMAN = ['I', 'II', 'III', 'IV'];
let currentSets = [];

function renderSheet(sets) {
  const host = document.getElementById('sheet');
  host.textContent = '';
  let n = 0;
  sets.forEach((cards, si) => {
    const sec = document.createElement('section');
    sec.className = 'set';
    const head = document.createElement('div');
    head.className = 'set-head';
    head.innerHTML = `<h2>Набір ${ROMAN[si]}</h2><span>картки ${String(si * 6 + 1).padStart(2, '0')}–${String(si * 6 + 6).padStart(2, '0')}</span>`;
    sec.appendChild(head);
    const grid = document.createElement('div');
    grid.className = 'cards';
    cards.forEach((card) => { n++; grid.appendChild(cardEl(card, n)); });
    sec.appendChild(grid);
    host.appendChild(sec);
  });
}

function cardEl(card, index) {
  const art = document.createElement('article');
  art.className = 'card';
  const g = document.createElement('div');
  g.className = 'card-grid';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      const v = card[r][c];
      cell.className = v ? 'cell' : 'cell is-empty';
      if (v) cell.textContent = v;
      g.appendChild(cell);
    }
  }
  art.appendChild(g);
  const badge = document.createElement('span');
  badge.className = 'card-badge';
  badge.textContent = String(index).padStart(2, '0');
  art.appendChild(badge);
  return art;
}

function renderPreview() {
  const host = document.getElementById('preview');
  if (!host) return;
  host.textContent = '';
  host.appendChild(cardEl(currentSets[0][0], 1));
}

/* ── налаштування ───────────────────────────────────────── */
const DEFAULTS = {
  '--card-bg': '#f0e6d2',
  '--card-border': '#7d5411',
  '--grid-line': '#a98f62',
  '--number-color': '#2d2b2b',
  '--number-font-size': 26,
  '--number-font-weight': 500,
  '--empty-pattern-alpha': 0.13,
  '--border-width': 2,
  '--border-radius': 3,
  '--card-padding': 10,
  '--row-height': 40,
  '--cards-per-row': 2,
  '--badge-radius': 2,
  '--grid-thickness': 1,
  badge: true,
  badgePosition: 'bottom-center',
  emptyStyle: 'diagonal',
  gridOn: true,
  gridFrameOn: true,
  fontName: '',
  fontData: '',
};

const PRESETS = {
  paper: { label: 'Тепла паперова', v: { '--card-bg': '#f0e6d2', '--card-border': '#7d5411', '--grid-line': '#a98f62', '--number-color': '#2d2b2b', '--border-width': 2, '--border-radius': 3, '--empty-pattern-alpha': 0.13, '--number-font-weight': 500 } },
  press: { label: 'Друкарня', v: { '--card-bg': '#f7f4ec', '--card-border': '#201f1d', '--grid-line': '#201f1d', '--number-color': '#201f1d', '--border-width': 3, '--border-radius': 0, '--empty-pattern-alpha': 0.2, '--number-font-weight': 600 } },
  quiet: { label: 'Тиха', v: { '--card-bg': '#ffffff', '--card-border': '#b68235', '--grid-line': '#d7d3d3', '--number-color': '#444141', '--border-width': 1, '--border-radius': 6, '--empty-pattern-alpha': 0.05, '--number-font-weight': 400 } },
};

const UNITS = {
  '--number-font-size': 'px', '--border-width': 'px', '--border-radius': 'px',
  '--card-padding': 'px', '--row-height': 'px', '--badge-radius': 'px',
  '--grid-thickness': 'px',
};

let settings = { ...DEFAULTS };

function applyCssVars(root) {
  Object.keys(DEFAULTS).forEach((k) => {
    if (!k.startsWith('--')) return;
    const u = UNITS[k] || '';
    root.style.setProperty(k, settings[k] + u);
  });
}

function applyBadgeState(root) {
  root.style.setProperty('--badge-display', settings.badge ? 'flex' : 'none');
  root.dataset.badgePosition = settings.badge ? settings.badgePosition : 'none';
}

function applyEmptyStyleState(root) {
  root.dataset.emptyStyle = settings.emptyStyle;
}

// Товщина внутрішніх ліній і власної рамки сітки йдуть з одного повзунка
// (--grid-thickness), але вмикаються/вимикаються незалежним чекбоксом
// кожна — тому виставляються тут поверх того, що вже встановив applyCssVars.
function applyGridThickness(root) {
  const gridThicknessRaw = settings['--grid-thickness'];
  root.style.setProperty('--grid-thickness', (settings.gridOn ? gridThicknessRaw : 0) + 'px');
  root.style.setProperty('--grid-frame-thickness', (settings.gridFrameOn ? gridThicknessRaw : 0) + 'px');
}

function applyNumberFont(root) {
  if (settings.fontName) root.style.setProperty('--number-font', `"${settings.fontName}", "Overpass", Arial, sans-serif`);
  else root.style.removeProperty('--number-font');
}

function apply() {
  const root = document.documentElement;
  applyCssVars(root);
  applyGridThickness(root);
  applyBadgeState(root);
  applyEmptyStyleState(root);
  applyNumberFont(root);
}

async function loadFont(name, dataUrl) {
  try {
    const face = new FontFace(name, `url(${dataUrl})`);
    await face.load();
    document.fonts.add(face);
    return true;
  } catch (e) { return false; }
}

function syncControls() {
  document.querySelectorAll('[data-var]').forEach((el) => {
    const k = el.dataset.var;
    if (el.type === 'checkbox') el.checked = settings[k];
    else if (el.type === 'radio') el.checked = el.value === settings[k];
    else el.value = settings[k];
    updateFieldVal(el);
  });
  document.getElementById('font-name').textContent = settings.fontName || 'Overpass (типовий)';
}

function updateFieldVal(el) {
  const out = el.parentElement.querySelector('.field-val');
  if (!out) return;
  const k = el.dataset.var;
  const u = UNITS[k] || '';
  out.textContent = el.value + u;
}

/* ── дії ────────────────────────────────────────────────── */
function regenerate() {
  currentSets = generateAll();
  renderSheet(currentSets);
  renderPreview();
}

function downloadJSON() {
  const payload = {
    generated: new Date().toISOString(),
    rules: { rows: ROWS, cols: COLS, numbersPerCard: 15, numbersPerRow: 5, sets: SETS, cardsPerSet: CARDS_PER_SET },
    sets: currentSets.map((cards, si) => ({ set: si + 1, cards: cards.map((grid, ci) => ({ card: si * 6 + ci + 1, grid })) })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'loto-cards.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ── SVG-контури для 3D-друку ──────────────────────────────
   Технічне креслення: зовнішня рамка + лінії сітки, числа як
   контур тексту (fill:none), реальний масштаб у міліметрах.
   Кожна картка — окремий SVG-файл; усі 24 пакуються в один .zip. */
const SVG_CELL_MM = 20;
const SVG_PAD_MM = 2;
const SVG_W = COLS * SVG_CELL_MM;
const SVG_H = ROWS * SVG_CELL_MM;

/* Усі структурні елементи (рамка, сітка) — суцільні залиті фігури
   (справжня геометрія з площею), а не тонкі обведення (stroke).
   Тонке обведення може не відобразитись у деяких переглядачах і не
   є "тілом" для 3D-друку/екструзії — заливка вирішує обидві проблеми. */
function svgLine(x1, y1, x2, y2, strokeWidth, opacity) {
  const op = opacity === undefined ? 1 : opacity;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="${strokeWidth}" stroke-opacity="${op}" fill="none" stroke-linecap="round" />`;
}
function svgFilledHLine(x1, x2, y, thickness) {
  return `<rect x="${Math.min(x1, x2)}" y="${y - thickness / 2}" width="${Math.abs(x2 - x1)}" height="${thickness}" fill="black" stroke="none" />`;
}
function svgFilledVLine(x, y1, y2, thickness) {
  return `<rect x="${x - thickness / 2}" y="${Math.min(y1, y2)}" width="${thickness}" height="${Math.abs(y2 - y1)}" fill="black" stroke="none" />`;
}
function svgCircle(cx, cy, r, opacity) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="black" fill-opacity="${opacity}" stroke="none" />`;
}
function svgFilledRect(x, y, w, h, opacity) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="black" fill-opacity="${opacity}" stroke="none" />`;
}

function roundedRectPath(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (r <= 0.01) return `M${x},${y} H${x + w} V${y + h} H${x} Z`;
  return `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} ` +
    `V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} ` +
    `A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
}

/* Рамка як суцільне залите кільце (зовнішній контур мінус внутрішній,
   fill-rule="evenodd") — завжди видима фігура з реальною площею. */
function svgFrame(x, y, w, h, thickness, rx) {
  if (thickness <= 0) return '';
  const outer = roundedRectPath(x, y, w, h, rx);
  const inner = roundedRectPath(x + thickness, y + thickness, w - thickness * 2, h - thickness * 2, Math.max(0, rx - thickness));
  return `<path fill-rule="evenodd" fill="black" stroke="none" d="${outer} ${inner}" />`;
}

/* alpha відповідає повзунку "Насиченість" (0..0.4) з панелі налаштувань —
   тут керує прозорістю заливки/ліній, як і на екрані. */
function emptyCellPatternSvg(x, y, style, alpha) {
  const s = SVG_CELL_MM;
  if (style === 'none') return '';
  if (style === 'diagonal' || style === 'cross') {
    let lines = '';
    for (let o = -s; o < s * 2; o += 4) lines += svgLine(o, 0, o - s, s, 0.25, alpha);
    if (style === 'cross') {
      for (let o = -s; o < s * 2; o += 4) lines += svgLine(o, s, o - s, 0, 0.25, alpha);
    }
    return `<g clip-path="url(#cell-clip)" transform="translate(${x},${y})">${lines}</g>`;
  }
  if (style === 'dots') {
    let out = '';
    for (let dy = 3; dy < s; dy += 4) {
      for (let dx = 3; dx < s; dx += 4) out += svgCircle(x + dx, y + dy, 0.5, alpha);
    }
    return out;
  }
  if (style === 'solid') return svgFilledRect(x, y, s, s, alpha);
  return '';
}

/* Цифри як лінії "семисегментного" індикатора — жодної залежності
   від системних чи кастомних шрифтів: суцільна векторна геометрія. */
const SEGMENTS = {
  0: 'ABCDEF', 1: 'BC', 2: 'ABGED', 3: 'ABGCD', 4: 'FGBC',
  5: 'AFGCD', 6: 'AFGECD', 7: 'ABC', 8: 'ABCDEFG', 9: 'ABCDFG',
};

function digitSvg(digit, x, y, w, h, strokeWidth) {
  const midY = h / 2;
  const coords = {
    A: [0, 0, w, 0], B: [w, 0, w, midY], C: [w, midY, w, h], D: [0, h, w, h],
    E: [0, midY, 0, h], F: [0, 0, 0, midY], G: [0, midY, w, midY],
  };
  const active = SEGMENTS[digit] || '';
  let out = '';
  for (const key of active) {
    const [x1, y1, x2, y2] = coords[key];
    out += svgLine(x + x1, y + y1, x + x2, y + y2, strokeWidth);
  }
  return out;
}

function numberSvg(num, cx, cy, digitH, strokeWidth) {
  const digitW = digitH * 0.5;
  const gap = digitW * 0.35;
  const str = String(num);
  const totalW = str.length * digitW + (str.length - 1) * gap;
  let x = cx - totalW / 2;
  const y = cy - digitH / 2;
  let out = '';
  for (const ch of str) {
    out += digitSvg(ch, x, y, digitW, digitH, strokeWidth);
    x += digitW + gap;
  }
  return out;
}

const BADGE_W = 16;
const BADGE_H = 9;

/* Справжні векторні контури цифр (реальний шрифт, ті самі криві, що й
   на сторінці) — через opentype.js (vendor/opentype.min.js). Це не
   растр і не наближення "індикатором": контур символу перетворюється
   на звичайний SVG <path>, тому файл не залежить від того, чи є цей
   шрифт встановлений у системі, яка відкриває SVG. */

/* opentype.js: пошук альтернативного гліфа за OpenType-фічею (напр.
   'lnum' — "рівні" цифри, як налаштовано на сайті через
   font-variant-numeric: lining-nums). Без цього беруться старостильні
   фігури шрифту за замовчуванням. */
function gsubCoverageIndex(coverage, glyphId) {
  if (coverage.format === 1) return coverage.glyphs.indexOf(glyphId);
  for (const r of coverage.ranges) {
    if (glyphId >= r.start && glyphId <= r.end) return r.index + (glyphId - r.start);
  }
  return -1;
}
function gsubApplySingle(subtable, glyphId) {
  const covIdx = gsubCoverageIndex(subtable.coverage, glyphId);
  if (covIdx === -1) return glyphId;
  return subtable.substFormat === 1 ? glyphId + subtable.deltaGlyphId : subtable.substitute[covIdx];
}
function gsubSubstitute(font, glyphId, featureTag) {
  const gsub = font.tables.gsub;
  if (!gsub) return glyphId;
  const idx = gsub.features.findIndex((f) => f.tag === featureTag);
  if (idx === -1) return glyphId;
  let g = glyphId;
  for (const li of gsub.features[idx].feature.lookupListIndexes) {
    const lookup = gsub.lookups[li];
    if (lookup.lookupType !== 1) continue;
    for (const sub of lookup.subtables) g = gsubApplySingle(sub, g);
  }
  return g;
}

/* Власна серіалізація команд контуру в SVG path — opentype.js
   toPathData() має відомий баг: за певних значень координат (звичайна
   похибка накопичення float при позиціонуванні символів по рядку)
   видає буквальний рядок "NaN" у d-атрибуті. "Сирі" команди контуру
   завжди коректні, тому серіалізуємо їх самі. */
function pathCommandsToD(commands, precision) {
  const fmt = (n) => {
    const r = Number(n.toFixed(precision));
    return (r === 0 ? 0 : r).toString();
  };
  let d = '';
  for (const c of commands) {
    if (c.type === 'M') d += `M${fmt(c.x)} ${fmt(c.y)} `;
    else if (c.type === 'L') d += `L${fmt(c.x)} ${fmt(c.y)} `;
    else if (c.type === 'C') d += `C${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x2)} ${fmt(c.y2)} ${fmt(c.x)} ${fmt(c.y)} `;
    else if (c.type === 'Q') d += `Q${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x)} ${fmt(c.y)} `;
    else if (c.type === 'Z') d += 'Z ';
  }
  return d.trim();
}

/* Кеш контурів цифр 0-9 (лінійні фігури, якщо шрифт їх підтримує) в
   одиницях "1 em" — масштабуємо/позиціонуємо під конкретний розмір
   під час рендеру картки, без повторного парсингу шрифту. */
function buildDigitGlyphCache(font) {
  const unitsPerEm = font.unitsPerEm;
  const glyphs = {};
  let refTop = 0, refBottom = 0;
  '0123456789'.split('').forEach((ch) => {
    const base = font.charToGlyph(ch);
    const lnumId = gsubSubstitute(font, base.index, 'lnum');
    const g = font.glyphs.get(lnumId);
    const scaledPath = g.getPath(0, 0, unitsPerEm); // fontSize=unitsPerEm → 1:1 у font units, ділимо самі
    const commands = scaledPath.commands.map((c) => {
      const out = { type: c.type };
      ['x', 'y', 'x1', 'y1', 'x2', 'y2'].forEach((k) => { if (c[k] !== undefined) out[k] = c[k] / unitsPerEm; });
      return out;
    });
    const bbox = scaledPath.getBoundingBox();
    refTop = Math.min(refTop, bbox.y1 / unitsPerEm);
    refBottom = Math.max(refBottom, bbox.y2 / unitsPerEm);
    glyphs[ch] = { commands, advance: g.advanceWidth / unitsPerEm };
  });
  return { glyphs, top: refTop, bottom: refBottom }; // top/bottom у "1 em" відносно базової лінії
}

/* Малює число вказаними кеш-контурами, відцентроване в (cx, cy),
   висотою targetHeightMM. Повертає null, якщо кеш недоступний —
   викликач тоді використовує резервний рендер. */
function digitsToSvgPath(str, cx, cy, targetHeightMM, digitCache) {
  if (!digitCache) return null;
  const emHeight = digitCache.bottom - digitCache.top;
  const scale = emHeight > 0 ? targetHeightMM / emHeight : 0;
  let width = 0;
  for (const ch of String(str)) width += (digitCache.glyphs[ch] ? digitCache.glyphs[ch].advance : 0) * scale;

  let x = cx - width / 2;
  const baselineY = cy - (digitCache.top + digitCache.bottom) / 2 * scale;
  let d = '';
  for (const ch of String(str)) {
    const g = digitCache.glyphs[ch];
    if (!g) continue;
    const moved = g.commands.map((c) => {
      const out = { type: c.type };
      ['x', 'y', 'x1', 'y1', 'x2', 'y2'].forEach((k) => {
        if (c[k] === undefined) return;
        out[k] = k[0] === 'x' ? x + c[k] * scale : baselineY + c[k] * scale;
      });
      return out;
    });
    d += pathCommandsToD(moved, 3) + ' ';
    x += g.advance * scale;
  }
  return `<path d="${d.trim()}" fill="black" />`;
}

function numberTextSvg(value, cx, cy, fontSizeMM, digitCache) {
  const asPath = digitsToSvgPath(value, cx, cy, fontSizeMM, digitCache);
  return asPath || numberSvg(value, cx, cy, fontSizeMM, 0.9); // резерв, якщо шрифт не вдалось завантажити
}

/* Типовий шрифт беремо з локального vendor/fonts/ (звичайний OTF), а не
   з Google Fonts "наживо": реальний браузер завжди отримує від Google
   формат woff2 (opentype.js його не розпаковує — потрібен окремий
   Brotli-декодер), і це неможливо обійти, бо fetch() не може підмінити
   User-Agent. Локальний файл — надійно і без залежності від мережі.
   Насичення Medium (500) немає в цьому релізі — беремо найближче. */
const OVERPASS_WEIGHTS = [300, 400, 600, 700];

async function fetchFontArrayBuffer() {
  if (settings.fontName && settings.fontData) {
    return fetch(settings.fontData).then((r) => r.arrayBuffer());
  }
  const target = settings['--number-font-weight'];
  const weight = OVERPASS_WEIGHTS.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
  return fetch(`vendor/fonts/overpass-${weight}.otf`).then((r) => r.arrayBuffer());
}

async function buildExportDigitCache() {
  try {
    const buffer = await fetchFontArrayBuffer();
    const font = opentype.parse(buffer);
    return buildDigitGlyphCache(font);
  } catch (e) {
    return null; // резерв: cardToSvg перейде на векторний "індикатор"
  }
}

/* opts: { emptyStyle, alpha, borderWidthPx, borderRadiusPx, cardPaddingPx,
           gridOn, gridFrameOn, gridThicknessPx, badgeOn, badgePosition,
           badgeRadiusPx, digitCache } */
// Наближені коефіцієнти переведення екранних px (як у налаштуваннях) у мм
// SVG-креслення: PX_TO_MM_THICK — для товстих елементів (рамка картки,
// відступи), PX_TO_MM_THIN — для тонких ліній сітки (вужчий діапазон
// повзунка, тому менший коефіцієнт).
const PX_TO_MM_THICK = 0.4;
const PX_TO_MM_THIN = 0.25;

/* Уся геометрія картки (рамка, сітка, зона під бейдж) — одним об'єктом,
   рахується один раз і передається в кожен із малювальних кроків нижче. */
function computeCardGeometry(opts) {
  const { borderWidthPx, borderRadiusPx, cardPaddingPx, gridOn, gridFrameOn, gridThicknessPx, badgeOn, badgePosition } = opts;
  const frameRx = borderRadiusPx * 0.5; // приблизне співвідношення px (екран) → мм (SVG)
  const frameThickness = borderWidthPx > 0 ? Math.max(0.6, borderWidthPx * PX_TO_MM_THICK) : 0;
  const cardPadding = Math.max(1, cardPaddingPx * PX_TO_MM_THICK); // відступ між рамкою і сіткою, як --card-padding на екрані
  // товщина внутрішніх ліній і власної рамки сітки — з одного значення,
  // але кожна вмикається/вимикається незалежно
  const gridThickness = gridOn ? gridThicknessPx * PX_TO_MM_THIN : 0;
  const gridFrameThickness = gridFrameOn ? gridThicknessPx * PX_TO_MM_THIN : 0;

  // Бейдж резервує місце з того боку картки (згори/знизу), де він
  // розташований, і сидить повністю в межах рамки з невеликим зазором
  // від сітки — так само, як на екрані.
  const badgeGap = 1.5; // мм, зазор між бейджем і сіткою
  const badgeVertical = badgePosition.startsWith('top') ? 'top' : 'bottom';
  const badgeHorizontal = badgePosition.endsWith('left') ? 'left' : badgePosition.endsWith('right') ? 'right' : 'center';
  const topPad = badgeOn && badgeVertical === 'top' ? cardPadding + BADGE_H + badgeGap : cardPadding;
  const bottomPad = badgeOn && badgeVertical === 'bottom' ? cardPadding + BADGE_H + badgeGap : cardPadding;

  const frameX = SVG_PAD_MM;
  const frameY = SVG_PAD_MM;
  const frameW = SVG_W + cardPadding * 2;
  const frameH = SVG_H + topPad + bottomPad;

  return {
    frameRx, frameThickness, cardPadding, gridThickness, gridFrameThickness,
    badgeVertical, badgeHorizontal,
    frameX, frameY, frameW, frameH,
    gridX: frameX + cardPadding,
    gridY: frameY + topPad,
    w: frameW + SVG_PAD_MM * 2,
    h: frameH + SVG_PAD_MM * 2,
  };
}

/* Зовнішня рамка картки + окрема рамка сітки + внутрішні лінії між
   клітинками (без меж — ті вже дає рамка сітки). */
function svgCardFrameAndGrid(geo) {
  let body = svgFrame(geo.frameX, geo.frameY, geo.frameW, geo.frameH, geo.frameThickness, geo.frameRx);
  body += svgFrame(geo.gridX, geo.gridY, SVG_W, SVG_H, geo.gridFrameThickness, 0);
  for (let c = 1; c < COLS; c++) {
    const x = geo.gridX + c * SVG_CELL_MM;
    body += svgFilledVLine(x, geo.gridY, geo.gridY + SVG_H, geo.gridThickness);
  }
  for (let r = 1; r < ROWS; r++) {
    const y = geo.gridY + r * SVG_CELL_MM;
    body += svgFilledHLine(geo.gridX, geo.gridX + SVG_W, y, geo.gridThickness);
  }
  return body;
}

/* Патерн порожніх клітинок і контури чисел — по всіх 27 клітинках. */
function svgCardCells(card, geo, emptyStyle, alpha, digitCache) {
  let patterns = '';
  let numbers = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = geo.gridX + c * SVG_CELL_MM;
      const y = geo.gridY + r * SVG_CELL_MM;
      const v = card[r][c];
      if (v === null) {
        patterns += emptyCellPatternSvg(x, y, emptyStyle, alpha);
      } else {
        numbers += numberTextSvg(v, x + SVG_CELL_MM / 2, y + SVG_CELL_MM / 2, SVG_CELL_MM * 0.5, digitCache);
      }
    }
  }
  return { patterns, numbers };
}

/* Бейдж із номером картки — рамка-кільце + число, повністю в межах
   зарезервованої зони geo.topPad/bottomPad. */
function svgCardBadge(index, geo, badgeOn, badgeRadiusPx, digitCache) {
  if (!badgeOn) return '';
  const bRx = (Math.min(BADGE_W, BADGE_H) / 2) * Math.min(1, badgeRadiusPx / 12);
  let bx;
  if (geo.badgeHorizontal === 'left') bx = geo.frameX + geo.cardPadding;
  else if (geo.badgeHorizontal === 'right') bx = geo.frameX + geo.frameW - geo.cardPadding - BADGE_W;
  else bx = geo.frameX + geo.frameW / 2 - BADGE_W / 2;
  const by = geo.badgeVertical === 'top' ? geo.frameY + geo.cardPadding : geo.frameY + geo.frameH - geo.cardPadding - BADGE_H;
  const label = String(index).padStart(2, '0');
  return svgFrame(bx, by, BADGE_W, BADGE_H, 0.6, bRx) +
    numberTextSvg(label, bx + BADGE_W / 2, by + BADGE_H / 2, BADGE_H * 0.6, digitCache);
}

function cardToSvg(card, index, opts) {
  const { emptyStyle, alpha, badgeOn, badgeRadiusPx, digitCache } = opts;
  const geo = computeCardGeometry(opts);

  const body = svgCardFrameAndGrid(geo);
  const { patterns, numbers } = svgCardCells(card, geo, emptyStyle, alpha, digitCache);
  const badge = svgCardBadge(index, geo, badgeOn, badgeRadiusPx, digitCache);

  const defs = `<defs><clipPath id="cell-clip"><rect x="0" y="0" width="${SVG_CELL_MM}" height="${SVG_CELL_MM}" /></clipPath></defs>`;

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${geo.w}mm" height="${geo.h}mm" viewBox="0 0 ${geo.w} ${geo.h}">\n` +
    `<title>Картка лото №${index}</title>\n${defs}\n${body}\n${patterns}\n${numbers}\n${badge}\n</svg>\n`;
}

/* ── мінімальний ZIP (метод STORE, без стиснення) ─────────── */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buildZip(files) {
  const encoder = new TextEncoder();
  const parts = [];
  const centralParts = [];
  let offset = 0;
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

  files.forEach(({ name, content }) => {
    const nameBytes = encoder.encode(name);
    const dataBytes = encoder.encode(content);
    const crc = crc32(dataBytes);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, dataBytes.length, true);
    local.setUint32(22, dataBytes.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);

    parts.push(new Uint8Array(local.buffer), nameBytes, dataBytes);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0, true);
    central.setUint16(10, 0, true);
    central.setUint16(12, dosTime, true);
    central.setUint16(14, dosDate, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, dataBytes.length, true);
    central.setUint32(24, dataBytes.length, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint16(30, 0, true);
    central.setUint16(32, 0, true);
    central.setUint16(34, 0, true);
    central.setUint16(36, 0, true);
    central.setUint32(38, 0, true);
    central.setUint32(42, offset, true);

    centralParts.push(new Uint8Array(central.buffer), nameBytes);

    offset += 30 + nameBytes.length + dataBytes.length;
  });

  const centralStart = offset;
  let centralSize = 0;
  centralParts.forEach((p) => { centralSize += p.length; });

  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(4, 0, true);
  end.setUint16(6, 0, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, centralStart, true);
  end.setUint16(20, 0, true);

  return new Blob([...parts, ...centralParts, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

async function downloadSVG() {
  const digitCache = await buildExportDigitCache();

  const opts = {
    emptyStyle: settings.emptyStyle,
    alpha: settings['--empty-pattern-alpha'],
    borderWidthPx: settings['--border-width'],
    borderRadiusPx: settings['--border-radius'],
    cardPaddingPx: settings['--card-padding'],
    gridOn: settings.gridOn,
    gridFrameOn: settings.gridFrameOn,
    gridThicknessPx: settings['--grid-thickness'],
    badgeOn: settings.badge,
    badgePosition: settings.badgePosition,
    badgeRadiusPx: settings['--badge-radius'],
    digitCache,
  };
  const files = [];
  currentSets.forEach((cards) => {
    cards.forEach((card) => {
      const globalIndex = files.length + 1;
      const name = `card-${String(globalIndex).padStart(2, '0')}.svg`;
      files.push({ name, content: cardToSvg(card, globalIndex, opts) });
    });
  });
  const blob = buildZip(files);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'loto-cards-svg.zip';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ── ініціалізація ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Налаштування ніде не зберігаються між сеансами — кожне перезавантаження
  // сторінки починається з типових значень (як натискання "Скинути").
  apply();
  syncControls();
  regenerate();

  document.querySelectorAll('[data-var]').forEach((el) => {
    const handler = () => {
      const k = el.dataset.var;
      settings[k] = el.type === 'checkbox' ? el.checked
        : el.type === 'radio' ? el.value
        : el.type === 'range' ? Number(el.value)
        : el.value;
      updateFieldVal(el);
      apply();
    };
    el.addEventListener('input', handler);
  });

  document.getElementById('font-file').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const name = file.name.replace(/\.[^.]+$/, '');
      const ok = await loadFont(name, reader.result);
      if (!ok) { document.getElementById('font-name').textContent = 'Не вдалося прочитати шрифт'; return; }
      settings.fontName = name;
      settings.fontData = reader.result;
      apply();
      document.getElementById('font-name').textContent = name;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('font-reset').addEventListener('click', () => {
    settings.fontName = ''; settings.fontData = '';
    document.getElementById('font-file').value = '';
    apply(); syncControls();
  });

  document.querySelectorAll('[data-preset]').forEach((b) => {
    b.addEventListener('click', () => {
      Object.assign(settings, PRESETS[b.dataset.preset].v);
      apply(); syncControls();
    });
  });

  document.getElementById('reset-all').addEventListener('click', () => {
    settings = { ...DEFAULTS };
    document.getElementById('font-file').value = '';
    apply(); syncControls();
  });

  document.querySelectorAll('[data-action="regenerate"]').forEach((b) => b.addEventListener('click', regenerate));
  document.getElementById('download-json').addEventListener('click', downloadJSON);
  document.getElementById('download-svg').addEventListener('click', downloadSVG);
  document.getElementById('print').addEventListener('click', () => window.print());
});
