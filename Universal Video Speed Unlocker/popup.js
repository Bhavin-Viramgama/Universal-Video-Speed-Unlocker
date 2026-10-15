// ============================================================
//  popup.js — Universal Video Speed Unlocker Pro
// ============================================================

'use strict';

const api = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

const PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 6, 8, 10, 16];
const MAX = 16;
const MIN = 0.07;
const ARC_LEN = 251.2;

let currentSpeed = 1;

// ---- DOM refs ----
let speedValueEl  = null;
let speedSlider   = null;
let sliderFillEl  = null;
let arcProgress   = null;
let presetsGrid   = null;
let bookmarksRow  = null;
let bmLabel       = null;

// ---- Utilities ----
function clamp(v, mn, mx) { return Math.min(mx, Math.max(mn, v)); }
function round2(v) { return Math.round(v * 100) / 100; }

function speedToArcOffset(speed) {
  const pct = Math.min(1, (speed - MIN) / (MAX - MIN));
  return ARC_LEN - pct * ARC_LEN;
}

function updateSliderTail(speed) {
  if (!speedSlider) return;
  const minVal = 7;
  const maxVal = 1600;
  const val = Math.round(speed * 100);
  const pct = Math.max(0, Math.min(100, ((val - minVal) / (maxVal - minVal)) * 100));
  speedSlider.style.setProperty('--slider-pct', `${pct}%`);
  if (sliderFillEl) {
    sliderFillEl.style.width = `${pct}%`;
  }
}

function updateUI(speed) {
  currentSpeed = round2(speed);
  const display = currentSpeed.toFixed(2);

  // Number
  if (speedValueEl) {
    speedValueEl.textContent = display;
    speedValueEl.classList.remove('flash');
    void speedValueEl.offsetWidth; // reflow trigger
    speedValueEl.classList.add('flash');
  }

  // Arc
  if (arcProgress) {
    arcProgress.style.strokeDashoffset = speedToArcOffset(currentSpeed);
  }

  // Slider (value 7–1600 maps to 0.07–16) and tail fill
  if (speedSlider) {
    speedSlider.value = Math.round(currentSpeed * 100);
    updateSliderTail(currentSpeed);
  }

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

// ---- Render bookmarks ----
function renderBookmarks(bookmarks) {
  if (!bookmarksRow) return;
  bookmarksRow.innerHTML = '';
  if (bmLabel) bmLabel.style.display = (bookmarks && bookmarks.length) ? '' : 'none';
  if (!Array.isArray(bookmarks)) return;
  bookmarks.forEach(s => {
    const chip = document.createElement('div');
    chip.className = 'bookmark-chip';
    chip.innerHTML = `<span>${s}×</span><span class="del-btn" data-speed="${s}" title="Remove">✕</span>`;
    chip.querySelector('span:first-child')?.addEventListener('click', () => setSpeed(s));
    chip.querySelector('.del-btn')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const res = await api.runtime.sendMessage({ type: 'DELETE_BOOKMARK', speed: s });
      if (res?.bookmarks) renderBookmarks(res.bookmarks);
    });
    bookmarksRow.appendChild(chip);
  });
}

// ---- Keyboard Shortcuts: dynamic rendering & browser link ----
function formatKey(key) {
  if (!key) return '';
  const k = key.trim();
  const lower = k.toLowerCase();
  if (lower === 'up' || lower === 'arrowup') return '↑';
  if (lower === 'down' || lower === 'arrowdown') return '↓';
  if (lower === 'left' || lower === 'arrowleft') return '←';
  if (lower === 'right' || lower === 'arrowright') return '→';
  if (lower === 'comma') return ',';
  if (lower === 'period') return '.';
  if (lower === 'slash') return '/';
  if (lower === 'backslash') return '\\';
  if (lower === 'space') return 'Space';
  if (lower === 'pageup') return 'PgUp';
  if (lower === 'pagedown') return 'PgDn';
  if (lower === 'command') return '⌘';
  if (lower === 'macctrl') return '⌃';
  if (lower === 'option') return '⌥';
  if (lower === 'ctrl' || lower === 'control') return 'Ctrl';
  if (lower === 'alt') return 'Alt';
  if (lower === 'shift') return 'Shift';
  if (lower === 'mediaplaypause') return '⏯';
  if (lower === 'medianexttrack') return '⏭';
  if (lower === 'mediaprevtrack') return '⏮';
  return k;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function getCommands() {
  try {
    if (api.commands && typeof api.commands.getAll === 'function') {
      const cmds = await new Promise((resolve) => {
        try {
          const res = api.commands.getAll((list) => {
            if (api.runtime.lastError) resolve([]);
            else resolve(list || []);
          });
          if (res && typeof res.then === 'function') {
            res.then(list => resolve(list || [])).catch(() => resolve([]));
          }
        } catch (_) {
          resolve([]);
        }
      });
      if (cmds && cmds.length > 0) return cmds;
    }
  } catch (_) {}

  try {
    const res = await api.runtime.sendMessage({ type: 'GET_COMMANDS' });
    if (res?.commands && res.commands.length > 0) return res.commands;
  } catch (_) {}

  return [];
}

async function loadShortcuts() {
  const commands = await getCommands();
  if (!commands || !commands.length) return;

  const container = document.getElementById('shortcuts-row');
  if (!container) return;

  const cmdMap = new Map();
  commands.forEach(c => {
    if (c.name) cmdMap.set(c.name, c);
  });

  const targets = [
    { name: 'increase-speed', label: 'faster', defaultKeys: ['Alt', '↑'] },
    { name: 'decrease-speed', label: 'slower', defaultKeys: ['Alt', '↓'] },
    { name: 'speed-1x',       label: 'reset',  defaultKeys: ['Alt', 'Z'] },
    { name: 'speed-max',      label: 'max',    defaultKeys: ['Alt', 'X'] }
  ];

  container.innerHTML = '';
  targets.forEach(({ name, label, defaultKeys }) => {
    const cmd = cmdMap.get(name);
    const item = document.createElement('div');
    item.className = 'shortcut-item';
    item.dataset.command = name;

    let kbdsHtml = '';
    let shortcutDisplay = '';
    if (cmd && typeof cmd.shortcut === 'string') {
      if (cmd.shortcut.trim()) {
        const keys = cmd.shortcut.split('+').map(formatKey);
        shortcutDisplay = keys.join('+');
        kbdsHtml = keys.map(k => `<kbd>${escapeHtml(k)}</kbd>`).join('');
      } else {
        // Explicitly unassigned by user
        shortcutDisplay = 'Unassigned';
        kbdsHtml = `<kbd class="kbd-unset" title="No shortcut assigned">—</kbd>`;
      }
    } else {
      // Fallback
      shortcutDisplay = defaultKeys.join('+');
      kbdsHtml = defaultKeys.map(k => `<kbd>${escapeHtml(k)}</kbd>`).join('');
    }

    item.title = cmd?.description
      ? `${cmd.description} (${shortcutDisplay})`
      : `${label}: ${shortcutDisplay}`;
    item.innerHTML = `${kbdsHtml} <span class="shortcut-label">${escapeHtml(label)}</span>`;
    container.appendChild(item);

    // Update button tooltips dynamically to match user's custom shortcuts
    if (name === 'increase-speed') {
      const btnPlus = document.getElementById('btn-plus');
      if (btnPlus) btnPlus.title = `Increase by 0.25x (${shortcutDisplay})`;
    } else if (name === 'decrease-speed') {
      const btnMinus = document.getElementById('btn-minus');
      if (btnMinus) btnMinus.title = `Decrease by 0.25x (${shortcutDisplay})`;
    } else if (name === 'speed-1x') {
      const btnReset = document.getElementById('btn-reset');
      if (btnReset) btnReset.title = `Reset to 1x (${shortcutDisplay})`;
    }
  });
}

function openShortcutsPage() {
  const ua = navigator.userAgent.toLowerCase();
  let url = 'chrome://extensions/shortcuts';
  if (ua.includes('firefox')) {
    url = 'about:addons';
  } else if (ua.includes('edg/')) {
    url = 'edge://extensions/shortcuts';
  } else if (ua.includes('opr/') || ua.includes('opera')) {
    url = 'opera://settings/keyboardShortcuts';
  } else if (navigator.brave !== undefined) {
    url = 'brave://extensions/shortcuts';
  }

  try {
    api.tabs.create({ url }, () => {
      if (api.runtime.lastError) {
        try { api.tabs.create({ url: 'chrome://extensions/shortcuts' }); } catch (_) {}
      }
    });
  } catch (_) {
    try { api.tabs.create({ url: 'chrome://extensions/shortcuts' }); } catch (_) {}
  }
}

// ---- Initialization ----
function initApp() {
  // Grab DOM elements
  speedValueEl  = document.getElementById('speed-value');
  speedSlider   = document.getElementById('speed-slider');
  sliderFillEl  = document.getElementById('slider-fill');
  arcProgress   = document.getElementById('arc-progress');
  presetsGrid   = document.getElementById('presets-grid');
  bookmarksRow  = document.getElementById('bookmarks-row');
  bmLabel       = document.getElementById('bm-label');

  // Build presets
  if (presetsGrid) {
    presetsGrid.innerHTML = '';
    PRESETS.forEach(s => {
      const chip = document.createElement('button');
      chip.className = 'preset-chip';
      chip.dataset.speed = s;
      chip.textContent = s < 1 ? s.toString() : `${s}×`;
      chip.title = `Set speed to ${s}x`;
      chip.addEventListener('click', () => setSpeed(s));
      presetsGrid.appendChild(chip);
    });
  }

  // Wire buttons with safe optional chaining
  document.getElementById('btn-plus')?.addEventListener('click', () =>
    setSpeed(round2(currentSpeed + 0.25)));

  document.getElementById('btn-minus')?.addEventListener('click', () =>
    setSpeed(round2(currentSpeed - 0.25)));

  document.getElementById('btn-reset')?.addEventListener('click', () => setSpeed(1));

  document.getElementById('btn-fine-plus')?.addEventListener('click', () =>
    setSpeed(round2(currentSpeed + 0.05)));

  document.getElementById('btn-fine-minus')?.addEventListener('click', () =>
    setSpeed(round2(currentSpeed - 0.05)));

  document.getElementById('btn-bookmark')?.addEventListener('click', async () => {
    const res = await api.runtime.sendMessage({ type: 'SAVE_BOOKMARK', speed: currentSpeed });
    if (res?.bookmarks) renderBookmarks(res.bookmarks);
  });

  // Slider
  speedSlider?.addEventListener('input', () => {
    const speed = clamp(speedSlider.value / 100, MIN, MAX);
    updateSliderTail(speed);
    setSpeed(speed);
  });

  // Keyboard shortcut hint link
  document.getElementById('shortcut-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    openShortcutsPage();
  });

  // Re-check shortcuts when window regains focus
  window.addEventListener('focus', loadShortcuts);

  // Init: load saved state & shortcuts
  (async () => {
    try {
      const state = await api.runtime.sendMessage({ type: 'GET_STATE' });
      if (state) {
        updateUI(state.speed ?? 1);
        renderBookmarks(state.bookmarks ?? []);
      }
    } catch (_) {
      updateUI(1);
    }
    loadShortcuts();
  })();
}

// Run init once the DOM is fully parsed
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// ---- Live sync: keyboard shortcuts update the popup in real-time ----
api.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SPEED_UPDATED') {
    updateUI(msg.speed);
  }
});
