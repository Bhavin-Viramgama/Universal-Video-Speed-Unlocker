// ============================================================
//  Universal Video Speed Unlocker Pro — background.js
//  Cross-browser: Chrome, Edge, Brave, Opera (MV3)
//  Firefox MV3 (experimental) via polyfill-compatible code
// ============================================================

// --- Cross-browser API shim ---
const api = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

// ---- Constants ----
const STEP   = 0.25;
const MIN    = 0.07;   // Slowest allowed (< 0.1 for ultra slow-mo)
const MAX    = 16;     // Highest allowed (beyond native 10x cap)
const PRESET_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 6, 8, 10, 16];

// ---- In-memory last speed (session only, not persisted) ----
let lastSpeed = 1;

// ---- Helper: inject speed change into all frames ----
async function injectSpeedCommand(tabId, command, value = null) {
  try {
    await api.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: executeSpeedCommand,
      args: [command, value]
    });
  } catch (err) {
    // Tab may be a special page (chrome://, edge://, etc.) — silently ignore
    console.warn('[SpeedUnlocker] Injection skipped:', err.message);
  }
}

// ---- Core function injected into page context ----
function executeSpeedCommand(command, value) {
  const STEP = 0.25;
  const MIN  = 0.07;
  const MAX  = 16;

  // Bypass site-imposed playbackRate caps using a property descriptor override
  function unlockVideoElement(video) {
    if (!video || video._speedUnlocked) return;
    try {
      const proto = Object.getPrototypeOf(video);
      if (!proto) return;
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'playbackRate');
      if (!descriptor) return;
      Object.defineProperty(video, 'playbackRate', {
        get() { return this._currentRate ?? descriptor.get.call(this); },
        set(rate) {
          // Mark that WE are making this change so the ratechange listener
          // below doesn't incorrectly treat it as an external reset.
          this._speedChanging = true;
          this._currentRate = Math.min(MAX, Math.max(MIN, rate));
          try { descriptor.set.call(this, this._currentRate); } catch (_) {}
          this._speedChanging = false;
        },
        configurable: true
      });
      // When the browser/site resets playbackRate externally (e.g. YouTube
      // calling video.load() after an ad), the native rate drops but our
      // _currentRate is still stale.  ratechange fires for any rate change,
      // so we use it to sync _currentRate back to the real native value.
      if (typeof video.addEventListener === 'function') {
        video.addEventListener('ratechange', function () {
          if (!this._speedChanging) {
            const native = descriptor.get.call(this);
            this._currentRate = native;
          }
        });
      }
      video._speedUnlocked = true;
    } catch (_) {}
  }

  function setVideoSpeed(video, newRate) {
    unlockVideoElement(video);
    newRate = Math.min(MAX, Math.max(MIN, +newRate.toFixed(4)));
    try { video.playbackRate = newRate; } catch (_) {}
    return newRate;
  }

  function getAllVideos() {
    const videos = Array.from(document.querySelectorAll('video'));
    // Also look inside open shadow roots
    document.querySelectorAll('*').forEach(el => {
      if (el.shadowRoot) {
        el.shadowRoot.querySelectorAll('video').forEach(v => {
          if (!videos.includes(v)) videos.push(v);
        });
      }
    });
    return videos;
  }

  function showHUD(rate, label = null) {
    let hud = document.getElementById('__speed-hud__');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = '__speed-hud__';
      document.documentElement.appendChild(hud);
    }

    const emoji = rate >= 2 ? '⚡' : rate < 1 ? '🐢' : '▶️';
    const display = label ?? `${parseFloat(rate.toFixed(2))}x`;

    Object.assign(hud.style, {
      position:         'fixed',
      bottom:           '70px',
      right:            '20px',
      background:       'linear-gradient(135deg, #1a0533 0%, #0d1b3e 100%)',
      border:           '1.5px solid rgba(139, 92, 246, 0.6)',
      boxShadow:        '0 8px 32px rgba(124, 58, 237, 0.4), 0 0 0 1px rgba(6,182,212,0.15)',
      color:            '#e2e8f0',
      padding:          '10px 18px',
      fontSize:         '15px',
      fontWeight:       '700',
      fontFamily:       '"Inter", "Segoe UI", Arial, sans-serif',
      borderRadius:     '12px',
      zIndex:           '2147483647',
      pointerEvents:    'none',
      transition:       'opacity 0.4s ease, transform 0.3s ease',
      opacity:          '1',
      transform:        'translateY(0)',
      letterSpacing:    '0.03em',
      backdropFilter:   'blur(12px)',
      webkitBackdropFilter: 'blur(12px)',
      minWidth:         '110px',
      textAlign:        'center',
      display:          'flex',
      alignItems:       'center',
      gap:              '6px'
    });

    // Build inner HTML with bar
    const pct = Math.min(100, (rate / MAX) * 100);
    hud.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;width:100%;gap:4px">
        <div style="display:flex;align-items:center;gap:6px;font-size:15px">
          <span>${emoji}</span>
          <span style="background:linear-gradient(90deg,#a78bfa,#67e8f9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${display}</span>
        </div>
        <div style="width:100%;height:3px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#7c3aed,#06b6d4);border-radius:2px;transition:width 0.3s ease"></div>
        </div>
      </div>
    `;

    clearTimeout(hud._timer);
    hud._timer = setTimeout(() => {
      hud.style.opacity   = '0';
      hud.style.transform = 'translateY(8px)';
    }, 2200);
  }

  const videos = getAllVideos();
  if (videos.length === 0) return;

  let resultRate = null;

  videos.forEach(video => {
    const current = video._currentRate ?? video.playbackRate ?? 1;
    let newRate;

    switch (command) {
      case 'increase-speed':
        newRate = Math.round((current + STEP) * 100) / 100;
        break;
      case 'decrease-speed':
        newRate = Math.round((current - STEP) * 100) / 100;
        break;
      case 'speed-1x':
        newRate = 1;
        break;
      case 'speed-max':
        newRate = MAX;
        break;
      case 'set-speed':
        newRate = value ?? 1;
        break;
      default:
        return;
    }

    resultRate = setVideoSpeed(video, newRate);
  });

  if (resultRate !== null) {
    const label = command === 'speed-max' ? `⚡ ${MAX}x MAX` : null;
    showHUD(resultRate, label);
  }

  // Report back current speed for popup sync
  return resultRate;
}

// ---- Helper: read the real speed from the main frame and broadcast to popup ----
async function syncSpeedToPopup(tabId) {
  try {
    const results = await api.scripting.executeScript({
      target: { tabId, allFrames: false },
      func: () => {
        // Use _currentRate (set by our override) as the authoritative value.
        const videos = Array.from(document.querySelectorAll('video'));
        document.querySelectorAll('*').forEach(el => {
          if (el.shadowRoot) {
            el.shadowRoot.querySelectorAll('video').forEach(v => {
              if (!videos.includes(v)) videos.push(v);
            });
          }
        });
        return videos.length > 0 ? (videos[0]._currentRate ?? videos[0].playbackRate) : null;
      }
    });
    const speed = results?.[0]?.result;
    if (speed !== null && speed !== undefined) {
      lastSpeed = speed;
      // Notify the popup if it happens to be open — it will update its UI.
      api.runtime.sendMessage({ type: 'SPEED_UPDATED', speed }).catch(() => {});
    }
  } catch (_) {}
}

// ---- Command listener ----
api.commands.onCommand.addListener(async (command) => {
  const tabs = await api.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]) return;
  await injectSpeedCommand(tabs[0].id, command);
  // Push the new speed to the popup (if open) so it stays in sync
  // with keyboard-driven changes made while the popup is visible.
  await syncSpeedToPopup(tabs[0].id);
});

// ---- Message listener (from popup) ----
api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === 'SET_SPEED') {
      const tabs = await api.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) { sendResponse({ ok: false }); return; }
      await injectSpeedCommand(tabs[0].id, 'set-speed', msg.speed);
      // Keep in-memory record for this session only (not persisted across tabs)
      lastSpeed = msg.speed;
      sendResponse({ ok: true });
    }

    if (msg.type === 'GET_STATE') {
      // Always read the REAL playbackRate from the page's video element.
      // This keeps the popup in sync after events like YouTube resetting
      // speed to 1x when an ad ends (our lastSpeed cache would be stale).
      let liveSpeed = lastSpeed;
      try {
        const tabs = await api.tabs.query({ active: true, currentWindow: true });
        if (tabs[0] && tabs[0].url && !tabs[0].url.startsWith('chrome://') && !tabs[0].url.startsWith('edge://')) {
          const results = await api.scripting.executeScript({
            target: { tabId: tabs[0].id, allFrames: false },
            func: () => {
              // _currentRate is the value maintained by our injected override.
              // After an ad ends, ratechange will have synced it to the native
              // rate, so this always reflects what the video is actually doing.
              let speed = null;
              const videos = Array.from(document.querySelectorAll('video'));
              document.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot) {
                  el.shadowRoot.querySelectorAll('video').forEach(v => {
                    if (!videos.includes(v)) videos.push(v);
                  });
                }
              });
              if (videos.length > 0) {
                speed = videos[0]._currentRate ?? videos[0].playbackRate ?? null;
              }
              return speed;
            }
          });
          const actual = results?.[0]?.result;
          if (actual !== null && actual !== undefined) {
            liveSpeed = actual;
            lastSpeed = actual; // re-sync cache to reality
          }
        }
      } catch (_) {
        // Special pages (chrome://, edge://) or no scripting access — use cache
      }

      const data = await api.storage.local.get('bookmarks');
      sendResponse({
        speed:     liveSpeed,
        bookmarks: data.bookmarks ?? []
      });
    }


    if (msg.type === 'SAVE_BOOKMARK') {
      const data = await api.storage.local.get('bookmarks');
      const bookmarks = data.bookmarks ?? [];
      if (!bookmarks.includes(msg.speed)) {
        bookmarks.push(msg.speed);
        bookmarks.sort((a, b) => a - b);
        await api.storage.local.set({ bookmarks });
      }
      sendResponse({ ok: true, bookmarks });
    }

    if (msg.type === 'DELETE_BOOKMARK') {
      const data = await api.storage.local.get('bookmarks');
      const bookmarks = (data.bookmarks ?? []).filter(s => s !== msg.speed);
      await api.storage.local.set({ bookmarks });
      sendResponse({ ok: true, bookmarks });
    }

    if (msg.type === 'GET_COMMANDS') {
      let cmds = [];
      try {
        if (api.commands?.getAll) {
          cmds = await new Promise((res) => {
            try {
              const p = api.commands.getAll((c) => res(c || []));
              if (p && typeof p.then === 'function') {
                p.then(c => res(c || [])).catch(() => res([]));
              }
            } catch (_) { res([]); }
          });
        }
      } catch (_) {}
      sendResponse({ commands: cmds });
    }
  })();
  return true; // async response
});
