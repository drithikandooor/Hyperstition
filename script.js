// ── Palette ──
const colorFamilies = {
  A: { t1: '#CEF32E', t2: '#70B100', t3: '#005624' },
  B: { t1: '#46F0F2', t2: '#00BABD', t3: '#1D555C' },
  C: { t1: '#7CA8FF', t2: '#3342E5', t3: '#27327C' },
  D: { t1: '#D085FF', t2: '#B000C7', t3: '#631153' },
  E: { t1: '#FFEB3A', t2: '#F8502F', t3: '#B61E00' },
};
const familyKeys = Object.keys(colorFamilies);

// State — colors generated once on load/refresh
let state = {
  orientation: 'vertical',
  pattern: 'alternating',
  waveType: 'sine',
  waveSize: 0,
  waveFreq: 1,
  wavePos: 0.5,  // 0=left, 0.5=center, 1=right
  colorMode: 'multi',
  showLayer1: true,
  scale: 1,
  colGap: 0,
  rowGap: 0,
};

let COMBOS = [];
let LAYER1_COLOR = '';
let RANDOM_OFFSETS = [];
const BASE = { W: 40, H: 203 };

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function getTiers(mode) {
  if (mode === 'mono') {
    const f = colorFamilies[pick(familyKeys)];
    return { t1: [f.t1], t2: [f.t2], t3: [f.t3] };
  } else if (mode === 'twotone') {
    const keys = [...familyKeys].sort(() => Math.random() - 0.5).slice(0, 2);
    return {
      t1: keys.map(k => colorFamilies[k].t1),
      t2: keys.map(k => colorFamilies[k].t2),
      t3: keys.map(k => colorFamilies[k].t3),
    };
  }
  return {
    t1: familyKeys.map(k => colorFamilies[k].t1),
    t2: familyKeys.map(k => colorFamilies[k].t2),
    t3: familyKeys.map(k => colorFamilies[k].t3),
  };
}

function pickCombinations(n, tiers) {
  const combos = [];
  for (let i = 0; i < n; i++) {
    combos.push([
      pick(tiers.t1),
      pick([...tiers.t2, ...tiers.t3]),
      pick(tiers.t1),
      pick([...tiers.t1, ...tiers.t2]),
      pick(tiers.t2),
      pick(tiers.t2),
    ]);
  }
  return combos;
}

// Called only on refresh — regenerates colors
function refreshColors() {
  const tiers = getTiers(state.colorMode);
  COMBOS = pickCombinations(3, tiers);
  LAYER1_COLOR = pick(tiers.t1);
  // Pre-generate random offsets for enough columns
  RANDOM_OFFSETS = Array.from({ length: 300 }, () => (Math.random() - 0.5) * BASE.H * 2);
}

// Wave offset functions — t is normalized 0..1 across columns
function getWaveOffset(t, type, amplitude, frequency, position) {
  const MAX = BASE.H * 2;
  const a = amplitude * MAX;
  const f = frequency;
  const tp = t - position + 0.5; // shift wave origin
  switch (type) {
    case 'sine':
      return Math.sin(tp * Math.PI * 2 * f) * a;
    case 'triangle':
      return (2 * Math.abs(((tp * f * 2) % 2) - 1) - 1) * a;
    case 'square':
      return (Math.sin(tp * Math.PI * 2 * f) >= 0 ? 1 : -1) * a;
    case 'sawtooth':
      return (((tp * f) % 1) * 2 - 1) * a;
    case 'bell':
      return -Math.exp(-Math.pow((t - position) * 4 * f, 2)) * a * 2;
    default:
      return 0;
  }
}

function buildScene(colors) {
  const scene = document.createElement('div');
  scene.className = 'scene';
  scene.style.setProperty('--layer2-color', colors[1]);
  scene.style.setProperty('--layer3-color', colors[2]);
  scene.style.setProperty('--layer4-color', colors[3]);
  scene.style.setProperty('--layer5-color', colors[4]);
  scene.style.setProperty('--layer6-color', colors[5]);

  const hasLayer6 = Math.random() < 0.5;
  for (let i = 6; i >= 2; i--) {
    if (i === 6 && !hasLayer6) continue;
    const layer = document.createElement('div');
    layer.className = `layer layer-${i}`;
    if (i === 4) layer.style.width = Math.random() < 0.5 ? 'calc(10 * var(--x))' : 'calc(20 * var(--x))';
    scene.appendChild(layer);
  }
  return scene;
}

function buildGrid() {
  const stack = document.getElementById('stack');
  stack.innerHTML = '';

  const { scale, colGap, rowGap, orientation, pattern, waveType, waveSize, waveFreq, wavePos } = state;
  const root = document.documentElement;
  root.style.setProperty('--x', scale + 'px');
  root.style.setProperty('--col-gap', colGap + 'px');
  root.style.setProperty('--row-gap', rowGap + 'px');

  const isHoriz = orientation === 'horizontal';
  const isDiag = pattern === 'diagonal';
  stack.className = isHoriz ? 'horizontal' : isDiag ? 'diagonal' : '';

  const formW = BASE.W * scale;
  const formH = BASE.H * scale;

  const diagonal = Math.ceil(Math.sqrt(
    Math.pow(window.innerWidth - 160, 2) + Math.pow(window.innerHeight, 2)
  ));

  const cols = isDiag
    ? Math.ceil(diagonal / formW) + 2
    : isHoriz
      ? Math.ceil((window.innerHeight) / (formW + colGap)) + 1
      : Math.ceil((window.innerWidth - 160) / (formW + colGap)) + 1;

  const rows = isDiag
    ? Math.ceil(diagonal / formH) + 2
    : isHoriz
      ? Math.ceil(window.innerWidth / (formH + rowGap)) + 2
      : Math.ceil(window.innerHeight / (formH + rowGap)) + 2;

  for (let c = 0; c < cols; c++) {
    const t = cols > 1 ? c / (cols - 1) : 0;

    let offset = 0;
    if (pattern === 'alternating') {
      offset = (c % 2 === 0 ? 0 : formH / 2);
    } else if (pattern === 'straight') {
      offset = 0;
    } else if (pattern === 'wave') {
      offset = getWaveOffset(t, waveType, waveSize, waveFreq, wavePos);
    } else if (pattern === 'diagonal') {
      offset = 0; // handled via rotation below
    }

    const column = document.createElement('div');
    column.className = 'column';

    if (pattern === 'diagonal') {
      const spacing = formW;
      const totalW = window.innerWidth - 160; // minus sidebar
      const startX = -totalW / 2 + c * spacing;
      column.style.position = 'absolute';
      column.style.left = '50%';
      column.style.top = '50%';
      column.style.marginLeft = startX + 'px';
      column.style.marginTop = (-formH * rows / 2) + 'px';
      column.style.transform = 'rotate(45deg)';
      column.style.transformOrigin = 'top center';
    }
    column.className = 'column';

    for (let r = 0; r < rows; r++) {
      const combo = COMBOS[Math.floor(Math.random() * COMBOS.length)];
      const scene = buildScene(combo);
      if (r === 0) {
        scene.style[isHoriz ? 'marginLeft' : 'marginTop'] = (offset - formH) + 'px';
      }
      column.appendChild(scene);
    }

    const line = document.createElement('div');
    line.className = 'column-line';
    line.style.backgroundColor = LAYER1_COLOR;
    if (!state.showLayer1) line.style.display = 'none';
    column.appendChild(line);

    stack.appendChild(column);
  }
}

function setupControls() {
  document.querySelectorAll('.btn-group').forEach(group => {
    group.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const id = group.id;
        if (id === 'orientation') state.orientation = btn.dataset.value;
        if (id === 'pattern') {
          state.pattern = btn.dataset.value;
          document.getElementById('wave-controls').style.display =
            btn.dataset.value === 'wave' ? 'flex' : 'none';
        }
        if (id === 'colormode') {
          state.colorMode = btn.dataset.value;
          refreshColors(); // re-pick colors for new mode
        }
        if (id === 'layer1toggle') {
          state.showLayer1 = btn.dataset.value === 'on';
        }
        if (id === 'wavetype') state.waveType = btn.dataset.value;
        buildGrid(); // no color refresh
      });
    });
  });

  const scaleSlider = document.getElementById('scale');
  const scaleVal = document.getElementById('scale-val');
  scaleSlider.addEventListener('input', () => {
    state.scale = parseFloat(scaleSlider.value);
    scaleVal.textContent = state.scale.toFixed(2) + '×';
    buildGrid();
  });

  const colGapSlider = document.getElementById('col-gap');
  const colGapVal = document.getElementById('col-gap-val');
  colGapSlider.addEventListener('input', () => {
    state.colGap = parseInt(colGapSlider.value);
    colGapVal.textContent = state.colGap;
    buildGrid();
  });

  const rowGapSlider = document.getElementById('row-gap');
  const rowGapVal = document.getElementById('row-gap-val');
  rowGapSlider.addEventListener('input', () => {
    state.rowGap = parseInt(rowGapSlider.value);
    rowGapVal.textContent = state.rowGap;
    buildGrid();
  });

  const waveSizeSlider = document.getElementById('wave-size');
  const waveSizeVal = document.getElementById('wave-size-val');
  waveSizeSlider.addEventListener('input', () => {
    state.waveSize = parseFloat(waveSizeSlider.value);
    waveSizeVal.textContent = Math.round(state.waveSize * 100) + '%';
    buildGrid();
  });

  const waveFreqSlider = document.getElementById('wave-freq');
  const waveFreqVal = document.getElementById('wave-freq-val');
  waveFreqSlider.addEventListener('input', () => {
    state.waveFreq = parseFloat(waveFreqSlider.value);
    waveFreqVal.textContent = state.waveFreq.toFixed(1);
    buildGrid();
  });

  const wavePosSlider = document.getElementById('wave-pos');
  const wavePosVal = document.getElementById('wave-pos-val');
  wavePosSlider.addEventListener('input', () => {
    state.wavePos = parseFloat(wavePosSlider.value);
    wavePosVal.textContent = Math.round(state.wavePos * 100) + '%';
    buildGrid();
  });

  document.getElementById('refresh-btn').addEventListener('click', () => {
    refreshColors();
    buildGrid();
  });
}

function exportSVG() {
  const stack = document.getElementById('stack');
  const BAR = 160;
  const W = window.innerWidth - BAR;
  const H = window.innerHeight;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  svg += `<rect width="${W}" height="${H}" fill="#e8e8e8"/>`;

  const columns = stack.querySelectorAll('.column');
  columns.forEach((col, ci) => {
    const colRect = col.getBoundingClientRect();
    const colX = colRect.left;

    // Draw scenes (layers 2-6)
    col.querySelectorAll('.scene').forEach(scene => {
      const sr = scene.getBoundingClientRect();
      const sy = sr.top - 42; // offset for toolbar

      scene.querySelectorAll('.layer').forEach(layer => {
        const lr = layer.getBoundingClientRect();
        const lw = lr.width;
        const lh = lr.height;
        const lx = lr.left + lw / 2; // center x
        const ly = lr.top + lh / 2;
        const x = lx - lw / 2;
        const y = ly - lh / 2;
        const fill = getComputedStyle(layer).backgroundColor;
        const opacity = getComputedStyle(layer).opacity;
        const rgb = fill.match(/\d+/g);
        const hex = rgb ? '#' + rgb.slice(0,3).map(v => parseInt(v).toString(16).padStart(2,'0')).join('') : '#000';
        svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${lw.toFixed(1)}" height="${lh.toFixed(1)}" fill="${hex}" opacity="${opacity}" style="mix-blend-mode:multiply"/>`;
      });
    });

    // Draw column line
    const line = col.querySelector('.column-line');
    if (line) {
      const lr = line.getBoundingClientRect();
      const fill = line.style.backgroundColor;
      const rgb = fill.match(/\d+/g);
      const hex = rgb ? '#' + rgb.slice(0,3).map(v => parseInt(v).toString(16).padStart(2,'0')).join('') : '#000';
      svg += `<rect x="${(lr.left + lr.width/2 - lr.width/2).toFixed(1)}" y="0" width="${lr.width.toFixed(1)}" height="${H}" fill="${hex}" style="mix-blend-mode:multiply"/>`;
    }
  });

  svg += `</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'layered-forms.svg';
  a.click();
  URL.revokeObjectURL(url);
}

refreshColors();
setupControls();
buildGrid();

document.getElementById('svg-btn').addEventListener('click', exportSVG);