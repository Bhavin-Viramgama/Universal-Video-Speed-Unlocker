// ============================================================
//  content.js — runs in every frame (MV3 + Firefox compatible)
//  Handles keyboard shortcuts as fallback + site-speed bypass
// ============================================================

(function () {
  'use strict';

  const MAX = 16;
  const MIN = 0.07;

  // ---- Unlock videos on page load and on new videos added ----
  function unlockVideo(video) {
    if (video._uvsuUnlocked) return;
    try {
      const proto = Object.getPrototypeOf(video);
      const desc  = Object.getOwnPropertyDescriptor(proto, 'playbackRate');
      if (!desc) return;
      Object.defineProperty(video, 'playbackRate', {
        get() { return this._uvRate ?? desc.get.call(this); },
        set(rate) {
          const clamped = Math.min(MAX, Math.max(MIN, rate));
          this._uvRate = clamped;
          try { desc.set.call(this, clamped); } catch (_) {}
        },
        configurable: true
      });
      video._uvsuUnlocked = true;
    } catch (_) {}
  }

  function unlockAll() {
    document.querySelectorAll('video').forEach(unlockVideo);
  }

  // Observe DOM for dynamically added videos
  const observer = new MutationObserver(() => unlockAll());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Initial unlock
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', unlockAll);
  } else {
    unlockAll();
  }

  // ---- Listen for messages from background (Firefox fallback) ----
  // In Firefox MV3, scripting.executeScript may work differently; this
  // content script provides a reliable message-based fallback.
  const browserApi = (typeof browser !== 'undefined') ? browser : chrome;

  browserApi.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'CONTENT_SET_SPEED') {
      document.querySelectorAll('video').forEach(v => {
        unlockVideo(v);
        try { v.playbackRate = msg.speed; } catch (_) {}
      });
    }
  });
})();
