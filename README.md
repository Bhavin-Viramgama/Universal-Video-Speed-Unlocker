# ⚡ Universal Video Speed Unlocker Pro

> **The only video speed controller that breaks every site's playback limit — with a stunning UI, speed memory, and fine-grained control.**

---

## 🌟 What makes this different?

| Feature | Other extensions | **This extension** |
|---|---|---|
| Works beyond native 10x cap | ❌ | ✅ Up to **16x** |
| Works inside iframes | ❌ | ✅ All frames |
| Unlocks sites that block speed | ❌ | ✅ Property override |
| Beautiful popup UI | ❌ | ✅ Arc meter + slider |
| Remembers speed per domain | ❌ | ✅ Auto-restore |
| Fine-grained 0.05x control | ❌ | ✅ Built-in |
| Bookmark custom speeds | ❌ | ✅ Save any speed |
| Works in **Shadow DOM** players | ❌ | ✅ Recursive search |
| **Firefox + Edge + Brave** | ❌ | ✅ All MV3 browsers |

---

## ✨ Features

- 🚀 **Speed up to 16×** — bypasses native browser cap via property descriptor override
- 🔓 **Unlock ANY site** — YouTube, Netflix, Udemy, Coursera, PW Skills, Skillshare, Twitch, Vimeo & more
- 🖼️ **Works in iframes & Shadow DOM** — even deeply nested video players
- 🎨 **Beautiful Popup** — arc speed meter, smooth slider (0.07× → 16×)
- 🔖 **Speed Bookmarks** — save and one-click apply your favorite speeds
- 🧠 **Per-domain speed memory** — auto-restores your speed when you revisit a site
- ⌨️ **Fine control** — 0.05× step buttons alongside 0.25× coarse steps
- 🌐 **Cross-browser** — Chrome, Edge, Brave, Opera (all Chromium MV3), Firefox MV3 experimental
- 💨 **Animated HUD overlay** — gradient arc popup with fade-out
- 🪶 **No external dependencies** — pure vanilla JS, < 15 KB total

---

## 📷 Screenshots

### Popup UI
A beautiful dark popup with:
- Live arc speed gauge
- Drag slider from 0.07× to 16×
- 14 quick preset chips
- Bookmark current speed
- Keyboard shortcut reference

### HUD Overlay (on-page)
Every speed change shows a gradient floating badge with a progress bar — for 2.2 seconds, then fades out.

---

## 🎮 Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Increase speed (+0.25×) | `Alt + ↑` |
| Decrease speed (−0.25×) | `Alt + ↓` |
| Reset to 1× | `Alt + Z` |
| Max speed (16×) | `Alt + X` |

> ✅ You can customize all shortcuts at `chrome://extensions/shortcuts` (or `edge://extensions/shortcuts` in Edge).

---

## 🚀 Installation

### Chrome / Edge / Brave / Opera
1. Download or clone this repository
2. Open your browser's extension manager:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`
   - Opera: `opera://extensions/`
3. Enable **Developer Mode** (top-right toggle)
4. Click **Load unpacked** → select the `Universal Video Speed Unlocker` folder

### Firefox (Experimental MV3)
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select any file inside the extension folder

---

## 🔧 How It Works

### 🔓 Speed Cap Bypass
Most video sites (YouTube, Udemy, etc.) override the native `playbackRate` setter to cap speed at 2× or 3×. This extension uses `Object.defineProperty` to replace that descriptor on each video element, allowing true speeds up to 16×.

### 🧠 Speed Memory
When you set a speed on `youtube.com`, it's saved in `chrome.storage.local`. Next time you open a YouTube tab, the extension automatically restores your preferred speed — silently, in the background.

### 📡 Cross-frame Injection
The `content.js` runs in ALL frames (`allFrames: true`) including iframes, so embedded video players on educational platforms get unlocked too.

---

## ⌨️ Customizing Shortcuts

1. Go to your browser's shortcut editor:
   - Chrome/Brave: `chrome://extensions/shortcuts`
   - Edge: `edge://extensions/shortcuts`
2. Find **Universal Video Speed Unlocker Pro**
3. Set your preferred key combos (e.g., `Ctrl+Shift+↑`)

---

## 🛠️ Developer Notes

- **Manifest V3** — compatible with all modern Chromium browsers
- **Cross-browser API shim** — `browser.*` (Firefox) vs `chrome.*` (Chrome/Edge) handled automatically
- **Storage** — uses `chrome.storage.local` for bookmarks and per-domain speed
- **No UI libraries** — pure vanilla JS + CSS

---

## 🤝 Contributing

PRs welcome! Ideas for future features:
- [ ] Export/import speed profiles
- [ ] Site-specific auto-speed rules
- [ ] Floating draggable speed wheel overlay

---

## 📄 License

MIT License — free to use, fork, and distribute.

---

*Made with ❤️ to save your time at 2× the speed.*
