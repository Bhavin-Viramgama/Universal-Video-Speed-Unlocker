// ============================================================
//  popup.js — Universal Video Speed Unlocker Pro
// ============================================================

'use strict';

const api = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

const PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 6, 8, 10, 16];
const MAX = 16;
const MIN = 0.07;

let currentSpeed = 1;

// ---- DOM refs ----
const speedValueEl  = document.getElementById('speed-value');
const speedSlider   = document.getElementById('speed-slider');
const arcProgress   = document.getElementById('arc-progress');
const hostnameLabel = document.getElementById('hostname-label');
const presetsGrid   = document.getElementById('presets-grid');
const bookmarksRow  = document.getElementById('bookmarks-row');
const bmLabel       = document.getElementById('bm-label');

// Arc total dash length for a semicircle path
const ARC_LEN = 251.2;

// ---- Utilities ----
function clamp(v, mn, mx) { return Math.min(mx, Math.max(mn, v)); }
function round2(v) { return Math.round(v * 100) / 100; }

function speedToArcOffset(speed) {
  const pct = Math.min(1, (speed - MIN) / (MAX - MIN));
  return ARC_LEN - pct * ARC_LEN;
}

function updateUI(speed) {
  currentSpeed = round2(speed);
  const display = currentSpeed.toFixed(2);

  // Number
  speedValueEl.textContent = display;
  speedValueEl.classList.remove('flash');
  void speedValueEl.offsetWidth; // reflow trigger
  speedValueEl.classList.add('flash');

  // Arc
  arcProgress.style.strokeDashoffset = speedToArcOffset(currentSpeed);

  // Slider (value 7–1600 maps to 0.07–16)
  speedSlider.value = Math.round(currentSpeed * 100);

  // Preset chips
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.classList.toggle('active', +chip.dataset.speed === currentSpeed);
  });
}

async function setSpeed(speed) {
  speed = clamp(round2(speed), MIN, MAX);
  updateUI(speed);
  try {
    await api.runtime.sendMessage({ type: 'SET_SPEED', speed });
  } catch (_) {}
}

// ---- Build presets ----
PRESETS.forEach(s => {
  const chip = document.createElement('button');
  chip.className = 'preset-chip';
  chip.dataset.speed = s;
  chip.textContent = s < 1 ? s.toString() : `${s}×`;
  chip.title = `Set speed to ${s}x`;
  chip.addEventListener('click', () => setSpeed(s));
  presetsGrid.appendChild(chip);
});

// ---- Render bookmarks ----
function renderBookmarks(bookmarks) {
  bookmarksRow.innerHTML = '';
  bmLabel.style.display = bookmarks.length ? '' : 'none';
  bookmarks.forEach(s => {
    const chip = document.createElement('div');
    chip.className = 'bookmark-chip';
    chip.innerHTML = `<span>${s}×</span><span class="del-btn" data-speed="${s}" title="Remove">✕</span>`;
    chip.querySelector('span:first-child').addEventListener('click', () => setSpeed(s));
    chip.querySelector('.del-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const res = await api.runtime.sendMessage({ type: 'DELETE_BOOKMARK', speed: s });
      renderBookmarks(res.bookmarks);
    });
    bookmarksRow.appendChild(chip);
  });
}

// ---- Button wiring ----
document.getElementById('btn-plus').addEventListener('click', () =>
  setSpeed(round2(currentSpeed + 0.25)));

document.getElementById('btn-minus').addEventListener('click', () =>
  setSpeed(round2(currentSpeed - 0.25)));

document.getElementById('btn-reset').addEventListener('click', () => setSpeed(1));

document.getElementById('btn-fine-plus').addEventListener('click', () =>
  setSpeed(round2(currentSpeed + 0.05)));

document.getElementById('btn-fine-minus').addEventListener('click', () =>
  setSpeed(round2(currentSpeed - 0.05)));

document.getElementById('btn-bookmark').addEventListener('click', async () => {
  const res = await api.runtime.sendMessage({ type: 'SAVE_BOOKMARK', speed: currentSpeed });
  if (res?.bookmarks) renderBookmarks(res.bookmarks);
});

// ---- Slider ----
speedSlider.addEventListener('input', () => {
  const speed = clamp(speedSlider.value / 100, MIN, MAX);
  setSpeed(speed);
});

// ---- Keyboard shortcut hint link ----
const shortcutLink = document.getElementById('shortcut-link');
shortcutLink.addEventListener('click', (e) => {
  e.preventDefault();
  // Works in Chrome/Edge; Firefox uses about:addons
  try {
    api.tabs.create({ url: 'chrome://extensions/shortcuts' });
  } catch (_) {
    api.tabs.create({ url: 'about:addons' });
  }
});

// ---- Init: load saved state ----
(async () => {
  try {
    const state = await api.runtime.sendMessage({ type: 'GET_STATE' });
    if (state) {
      hostnameLabel.textContent = state.hostname ?? 'Unknown site';
      updateUI(state.speed ?? 1);
      renderBookmarks(state.bookmarks ?? []);
    }
  } catch (_) {
    updateUI(1);
  }
})();
