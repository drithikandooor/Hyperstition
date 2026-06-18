const ASPECT_W   = 1800;
const ASPECT_H   = 800;
const GRID_LINES = 20;

let cw, ch;

let spineS         = [];
let spineFlipped   = [];
let spinePalette   = [];
let spinePalLerp   = [];
let spineY         = [];
let spineRandY     = [];
let spineRandH     = [];
let spineHeightF   = [];
let spineHeightF5  = [];
let waveHeightF4   = [];
let waveHeightF5   = [];
let spineRestS     = [];  // wave-only s, never mouse-boosted — used for palette flip

let introFade   = 0;
let wasInCanvas = false;

const COOL = {
  l1: { center: '#17696F', mid: '#7CA8FF', outer: '#CEF32E' },
  l2: { center: '#00BABD', mid: '#ffea47' },
  l3: { center: '#7ca8ff' },
  l4: { center: '#7CA8FF' },
  l5: { center: '#CEF32E' },
};

const WARM = {
  l1: { center: '#7D1F66', mid: '#ff5b3a', outer: '#7ca8ff' },
  l2: { center: '#C9499F', mid: '#ffea47' },
  l3: { center: '#7ca8ff' },
  l4: { center: '#C9499F' },
  l5: { center: '#7ca8ff' },
};

function lerpHex(a, b, t) {
  const ar = parseInt(a.slice(1,3),16), ag = parseInt(a.slice(3,5),16), ab = parseInt(a.slice(5,7),16);
  const br = parseInt(b.slice(1,3),16), bg = parseInt(b.slice(3,5),16), bb = parseInt(b.slice(5,7),16);
  return `rgb(${Math.round(ar+(br-ar)*t)},${Math.round(ag+(bg-ag)*t)},${Math.round(ab+(bb-ab)*t)})`;
}

function blendPalette(t) {
  return {
    l1: {
      center: lerpHex(COOL.l1.center, WARM.l1.center, t),
      mid:    lerpHex(COOL.l1.mid,    WARM.l1.mid,    t),
      outer:  lerpHex(COOL.l1.outer,  WARM.l1.outer,  t),
    },
    l2: {
      center: lerpHex(COOL.l2.center, WARM.l2.center, t),
      mid:    lerpHex(COOL.l2.mid,    WARM.l2.mid,    t),
    },
    l3: { center: lerpHex(COOL.l3.center, WARM.l3.center, t) },
    l4: { center: lerpHex(COOL.l4.center, WARM.l4.center, t) },
    l5: { center: lerpHex(COOL.l5.center, WARM.l5.center, t) },
  };
}

function setup() {
  scaleToWindow();
  const cnv = createCanvas(cw, ch);
  cnv.parent('canvas-container');
  for (let i = 0; i <= GRID_LINES; i++) {
    spineS.push(0);
    spineFlipped.push(false);
    spinePalette.push(0);
    spinePalLerp.push(0);
    spineY.push(ch / 2);
    spineRandY.push(random(-ch * 0.26, ch * 0.26));
    spineRandH.push(random(0.3, 1.0));
    spineHeightF.push(0);
    spineHeightF5.push(0);
    waveHeightF4.push(0);
    waveHeightF5.push(0);
    spineRestS.push(0);
  }
  loop();
}

function windowResized() {
  scaleToWindow();
  resizeCanvas(cw, ch);
}

function scaleToWindow() {
  const ratio   = ASPECT_W / ASPECT_H;
  const padding = 32;
  const maxW    = windowWidth  - padding;
  const maxH    = windowHeight - padding;
  if (maxW / ratio <= maxH) {
    cw = maxW;
    ch = Math.round(maxW / ratio);
  } else {
    ch = maxH;
    cw = Math.round(maxH * ratio);
  }
}

function draw() {
  background(255);

  const u = cw / ASPECT_W * 6;
  const t = millis() / 1000;

  introFade = constrain(introFade + 0.012, 0, 1);
  const paletteActive = introFade > 0.95;

  const mouseInCanvas = mouseX > 0 && mouseX < cw && mouseY > 0 && mouseY < ch;

  // if (wasInCanvas && !mouseInCanvas) {
  //   for (let i = 0; i <= GRID_LINES; i++) {
  //     spineRandY[i] = random(-ch * 0.1, ch * 0.1);
  //   }
  // }
  wasInCanvas = mouseInCanvas;

  const h1 = ch / 4;
  const h3 = ch;

  const waveSpeed = 0.25;
  const wavePhase = t * waveSpeed * TWO_PI;

  const maxHalfW = 54 * u / 6 / 2;
  const margin   = maxHalfW;
  const spread   = cw - margin * 2;

  const L4_THRESH = 0.70;
  const L5_THRESH = 0.85;

  for (let i = 0; i <= GRID_LINES; i++) {
    const x           = margin + (i / GRID_LINES) * spread;
    const spineOffset = (i / GRID_LINES) * TWO_PI * 2;
    const osc         = map(sin(wavePhase - spineOffset), -1, 1, 0, 1);

    let mouseBoost = 0;
    if (mouseInCanvas) {
      const d  = abs(mouseX - x);
      const tv = constrain(1 - d / (cw * 0.25), 0, 1);
      mouseBoost = tv * tv * (3 - 2 * tv);
    }

    const targetS = constrain(max(osc, mouseBoost), 0, 1) * introFade;
    spineS[i] += (targetS - spineS[i]) * 0.12;
    const s = constrain(spineS[i], 0, 1);

    if (paletteActive) {
      const isThin = osc < 0.001 && s < 0.05;
      if (isThin && !spineFlipped[i]) {
        spinePalette[i] = 1 - spinePalette[i];
        spineFlipped[i] = true;
      } else if (!isThin) {
        spineFlipped[i] = false;
      }
    }
    spinePalLerp[i] += (spinePalette[i] - spinePalLerp[i]) * 0.15;
    const pal = blendPalette(spinePalLerp[i]);

    const w = (units) => units * u / 6 * s;

    const cy3 = ch / 2;

    const mouseSpineIdx = mouseInCanvas ? constrain((mouseX / cw) * GRID_LINES, 0, GRID_LINES) : i;
    const spineDist     = abs(i - mouseSpineIdx);
    const lagFactor     = constrain(spineDist / (GRID_LINES / 2), 0, 1);
    const easeRate      = mouseInCanvas ? lerp(0.04, 0.008, lagFactor) : 0.05;

    const heightTarget = mouseInCanvas ? mouseBoost : 0;
    spineHeightF[i]   += (heightTarget - spineHeightF[i]) * 0.10;
    const hf  = spineHeightF[i];
    const hf4 = hf * hf;

    let mouseBoost5 = 0;
    if (mouseInCanvas) {
      const d5  = abs(mouseX - x);
      const tv5 = constrain(1 - d5 / (cw * 0.075), 0, 1);
      mouseBoost5 = tv5 * tv5 * (3 - 2 * tv5);
    }
    const heightTarget5 = mouseInCanvas ? mouseBoost5 : 0;
    spineHeightF5[i]   += (heightTarget5 - spineHeightF5[i]) * 0.08;
    const hf5 = sqrt(spineHeightF5[i]);

    const waveTarget4 = constrain((osc - L4_THRESH) / (1.0 - L4_THRESH), 0, 1);
    const waveTarget5 = constrain((osc - L5_THRESH) / (1.0 - L5_THRESH), 0, 1);

   waveHeightF4[i] += (waveTarget4 - waveHeightF4[i]) * 0.06;
  waveHeightF5[i] += (waveTarget5 - waveHeightF5[i]) * 0.06;

    const drive4 = max(hf4, waveHeightF4[i]);
    const drive5 = hf5;

    const h1Dynamic = lerp(h1 * 2.4, h1 * 3.5, hf) * spineRandH[i];
    const h4Dynamic = h1Dynamic * (1/2);
    const h5Dynamic = h4Dynamic * (1/2);

    const randScale = mouseInCanvas ? 0.25 : 1.0;
    const targetY   = mouseInCanvas ? mouseY + spineRandY[i] * randScale : ch / 2 + spineRandY[i];
    spineY[i]      += (targetY - spineY[i]) * easeRate;
    const cy12 = constrain(spineY[i], h1Dynamic / 2, ch - h1Dynamic / 2);
    const cy4  = constrain(spineY[i], h4Dynamic / 2, ch - h4Dynamic / 2);
    const cy5  = constrain(spineY[i], h5Dynamic / 2, ch - h5Dynamic / 2);

    noStroke();
    rectMode(CENTER);

    if (h5Dynamic > h1Dynamic * 0.05) {
    fill(pal.l5.center);
    rect(x, cy5, lerp(w(30), w(54), drive5), h5Dynamic);
    }

    if (h4Dynamic > h1Dynamic * 0.1) {
      fill(pal.l4.center);
      rect(x, cy4, lerp(w(30), w(42), drive4), h4Dynamic);
    }

    fill(pal.l3.center);
    rect(x, cy3, w(6), h3);

    fill(pal.l2.mid);
    rect(x, cy12, w(18), ch);

    fill(pal.l2.center);
    rect(x, cy12, w(6), ch);

    fill(pal.l1.outer);
    rect(x, cy12, w(30), h1Dynamic);

    fill(pal.l1.mid);
    rect(x, cy12, w(18), h1Dynamic);

    fill(pal.l1.center);
    rect(x, cy12, w(6), h1Dynamic);
  }
}