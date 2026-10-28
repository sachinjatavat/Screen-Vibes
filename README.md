# ✨ Screen Vibes

> ### ⚡ Developed By Sachin
> **Ambient RGB Perimeter Lighting & Music-Reactive Screen Edges for Windows**

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011-blue?style=flat-square&logo=windows)](https://github.com/sachinjatavat/Screen-Vibes)
[![Electron](https://img.shields.io/badge/Electron-33.4-informational?style=flat-square&logo=electron)](https://github.com/sachinjatavat/Screen-Vibes)
[![UI Theme](https://img.shields.io/badge/Theme-Claymorphism-ff00e5?style=flat-square)](https://github.com/sachinjatavat/Screen-Vibes)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](https://github.com/sachinjatavat/Screen-Vibes)

---

## 📖 Detailed Description

**Screen Vibes** is a premium, lightweight Windows desktop application created by **Sachin** that transforms your laptop or external monitor edges into an immersive ambient RGB light show and music visualizer. 

Operating as an ultra-smooth, transparent, click-through overlay window, Screen Vibes runs quietly above your desktop and active windows without stealing focus or intercepting mouse clicks and keyboard shortcuts. Whether you are coding, gaming, editing videos, or streaming music, your screen borders stay vibrantly illuminated.

The app features two core lighting engines that can operate independently or simultaneously:
1. **The Continuous Traveling Light Wave**: A luminous light wave with an intense comet head and decaying neon tail circulating around all four borders of your screen (Top, Right, Bottom, Left) with seamless corner rounding and zero-jump direction reversal.
2. **The Audio-Reactive Visualizer**: A direct Windows loopback audio engine capturing system audio in real-time (Spotify, YouTube, games, media players) and visualizing sound waves, bars, ambient glows, or bass pulses along the screen bezel.

Screen Vibes is styled with a tactile, custom **Claymorphism** interface—featuring inflated 3D surfaces, soft-depth shadows, pressable tactile buttons, a live miniature laptop screen preview, and instant customization sliders.

---

## 🌟 Key Features

### 💫 1. Continuous Perimeter Traveling Light Wave
- **Full Perimeter Circulation**: The wave glides continuously across all four display borders: **Top $\to$ Right $\to$ Bottom $\to$ Left** (or counter-clockwise).
- **Luminous Comet Head**: Features a bright white-hot core filament and a radial bloom flare centered at the head that illuminates both intersecting borders as it rounds screen corners.
- **Smooth Glowing Trail**: Powered by an exponential power-curve decay $(1 - p)^{1.6}$, ensuring the trail dissolves gradually into darkness with zero visible cutoffs.
- **Inward Volumetric Diffusion**: Ambient light diffuses into the screen interior using additive linear gradients perpendicular to each edge, mimicking high-end monitor underglow and ambient backlights.
- **Smooth Corner Transitions**: Automatically inserts corner vertices whenever a segment crosses an edge boundary. Combined with Canvas `lineJoin = 'round'`, corners turn with circular precision—free from gaps, seams, or diagonal cuts.
- **Normalized Perimeter Path**: Velocity is normalized against the total perimeter $P = 2(W + H)$, so the wave moves at a consistent linear speed across both long horizontal laptop borders and shorter vertical edges.

---

### 🔄 2. Real-Time Direction & Dual Crossing Waves
- **↻ Clockwise**: A single light wave circulates clockwise around all four screen edges.
- **↺ Anticlockwise**: A single light wave circulates counter-clockwise.
- **⇄ Dual Waves (Intersecting)**: Two light waves circulate along the screen borders simultaneously in **opposite directions** (one clockwise, one anticlockwise). As they travel, they meet each other, **intersect and pass right through each other** with an amplified additive luminous flash, and continue circulating endlessly around the perimeter.
- **Interactive Mini Screen Preview**: A miniature clay-bezeled laptop screen inside the settings panel renders a real-time 60 FPS visual preview of the wave(s), showing both single and dual crossing waves in real time.

---

### 🎵 3. System Audio-Reactive Edge Visualizer
- **Zero-Configuration Loopback Capture**: Directly captures Windows system audio (Spotify, YouTube, games, Discord) via Desktop Capturer loopback—no virtual audio cables or extra drivers needed.
- **Autoplay Policy Bypass**: Utilizes `autoplayPolicy = 'no-user-gesture-required'` and an automatic AudioContext watchdog to guarantee audio is processed without requiring manual user gestures.
- **Zero Height on Silence**: Removed hardcoded minimum heights so visualizer bars and waves completely disappear when audio is paused or silent.
- **4 Visualizer Modes**:
  - **Bars**: Multi-band frequency equalizer columns radiating inward from screen edges.
  - **Wave**: Continuous fluid oscilloscope ribbon reacting to audio waveform.
  - **Glow**: Soft volumetric ambient diffusion responding to frequency energy.
  - **Pulse**: Deep bass-triggered perimeter flash tuned for punchy beats.
- **Per-Edge Control**: Toggle visualizers independently on Top, Bottom, Left, and Right edges.

---

### 🎨 4. Tactile Claymorphism User Interface
Designed by **Sachin**, the settings panel departs from generic flat templates in favor of a rich **Claymorphism** design system:
- **Pillowy 3D Clay Cards**: Deep slate surfaces (`#1e1e2f`) with dual inner highlights and soft ambient drop shadows.
- **Tactile Clay Buttons**: Elevated, pressable buttons that physically depress when clicked.
- **Clay Sliders & Switches**: Deep recessed groove tracks paired with inflated, glowing clay thumbs and knobs.
- **Live Badges**: Real-time numeric readouts for speed, length, glow, and thickness.
- **1-Click Theme Presets**:
  - ⚡ **Cyber Neon** (Cyan + Hot Pink)
  - 🌅 **Sunset Blaze** (Crimson + Gold)
  - 🌊 **Deep Ocean** (Electric Blue + Aqua)
  - 👾 **Matrix Glitch** (Cyber Green + Emerald)
  - 🔮 **Vapor Violet** (Electric Purple + Pink)
  - 🔥 **Solar Flare** (Ruby Red + Amber)
  - 🌌 **Aurora Borealis** (Teal + Purple)
  - 🌈 **RGB Rainbow** (Smooth multi-color Chroma spectrum)

---

### 🖥️ 5. Display Compatibility & Performance
- **High-DPI Laptop Scaling**: Canvas backbuffer automatically scales to `window.devicePixelRatio` (125%, 150%, 200%), ensuring razor-sharp rendering on Retina and 4K displays.
- **Full Display Coverage**: Covers the full physical screen area, including the Windows taskbar, using `screen.getPrimaryDisplay().bounds`.
- **Multi-Monitor Support**: Select between **All Connected Displays** or **Primary Display Only**. Dynamically recreates overlays when monitors are plugged in, unplugged, or resolution changes (`display-metrics-changed`).
- **100% Click-Through**: Built with `setIgnoreMouseEvents(true, { forward: true })` and `focusable: false`. Mouse clicks, scrolls, and keystrokes pass straight through to background windows.
- **Always-on-Top Above Fullscreen**: Uses `setAlwaysOnTop(true, 'screen-saver')` and `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })` to remain visible above browser full-screen videos and borderless games.
- **Low CPU/GPU Footprint**: Built with hardware-accelerated 2D canvas and frame delta interpolation for steady 60/120 FPS performance with minimal battery drain.

---

### ⚙️ 6. System Integration & Autostart
- **Single-Instance Lock**: Prevents accidental duplicate windows. Launching a second instance brings the existing settings panel into focus.
- **Start with Windows**: Toggle "Start with Windows" in settings or the system tray to automatically launch on boot silently into the tray (`--hidden`), keeping the overlay running.
- **System Tray Quick Menu**: Right-click the tray icon to quickly toggle the light wave, reverse direction, show/hide all vibes, open debug logs, or quit.
- **No Console Window**: Packaged as a clean native Windows GUI executable.

---

## 🎛️ Customization Controls

| Setting | Range / Options | Description |
| :--- | :--- | :--- |
| **Light Wave Toggle** | `ON` / `OFF` | Master switch to enable or disable perimeter wave animation. |
| **Direction** | `↻ Clockwise`, `↺ Anticlockwise`, `⇄ Dual Waves` | Select single wave travel or dual opposite intersecting waves. |
| **Animation Speed** | `0.2x` – `3.0x` | Multiplier for perimeter cycle duration. |
| **Wave Length** | `10%` – `80%` | Fraction of the total screen perimeter spanned by the wave and trail. |
| **Glow Intensity** | `20%` – `200%` | Multiplier for radial bloom, shadow blur, and inward ambient diffusion. |
| **Border Thickness** | `4px` – `50px` | Stroke thickness of the core light beam and depth of edge wash. |
| **Color Modes** | `Rainbow`, `Gradient`, `Head+Trail`, `Solid`, `Sync` | Select between animated RGB spectrum, dual-color fade, or audio-synced colors. |
| **Visualizer Style** | `Bars`, `Wave`, `Glow`, `Pulse`, `Off` | Audio reactive visualizer style. |
| **Audio Sensitivity** | `0.3` – `3.0` | Gain multiplier for audio frequency detection. |
| **Audio Size** | `40px` – `400px` | Maximum height of audio bars and waves extending from screen borders. |
| **Audio Smoothness** | `0.20` – `0.92` | Smoothing time constant for audio transitions. |
| **Start with Windows**| `Enabled` / `Disabled` | Automatically runs Screen Vibes on Windows startup into the tray. |

---

## 🚀 Installation & Running

### Option A: Prebuilt Windows Executables
Download the latest binaries from the `dist/` directory or releases:
- **Installer (Recommended)**: `Screen Vibes Setup 1.0.0.exe` (Standard NSIS installer with desktop & start menu shortcuts).
- **Portable Version**: `Screen Vibes-Portable-1.0.0.exe` (Zero-install standalone executable, run directly).

### Option B: Run from Source
1. **Prerequisites**: Make sure [Node.js](https://nodejs.org/) (LTS v18+) is installed.
2. **Clone the repository**:
   ```bash
   git clone https://github.com/sachinjatavat/Screen-Vibes.git
   cd Screen-Vibes
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Launch Screen Vibes**:
   ```bash
   npm start
   ```

### Option C: Build Installers
To compile your own NSIS installer and portable executable:
```bash
npm run dist
```
The output executables will be generated in the `dist/` directory.

---

## 📁 Project Architecture

```
screen-vibes/
├── main.js          # Electron main process (multi-monitor overlays, tray, autostart, loopback session)
├── overlay.html     # Transparent fullscreen overlay document
├── overlay.js       # Wave math, perimeter geometry, inward diffusion, Web Audio FFT analyzer
├── panel.html       # Claymorphism settings UI with mini live preview canvas & controls
├── panel.js         # Settings sync, clay slider bindings, real-time mini preview loop
├── preload.js       # Secure ContextBridge IPC between renderer and main process
├── icon.ico         # Multi-resolution Windows app icon (256, 128, 64, 48, 32, 16px)
├── icon.png         # 256x256 high-resolution icon asset
├── package.json     # App configuration, electron-builder NSIS and Portable build specifications
└── .gitignore       # Git exclusion rules (node_modules, dist, logs)
```

---

## 🔍 Troubleshooting & Debug Logging

- **No audio reaction?**
  - Verify your Windows default playback device has active sound playing.
  - Check the debug log by right-clicking the system tray icon and selecting **"Open Debug Log"**, or open:
    `%APPDATA%\Screen Vibes\debug.log`
  - Look for `[Audio Status] AC: running | Track: live | MaxFreq: ...`. If `MaxFreq` is greater than 0, audio is being received.
- **Overlay above or below games?**
  - Set your games or media player to **Borderless Windowed** or **Fullscreen Windowed** mode for optimal overlay visibility.

---

## 👤 Author & Credits

- **Developed By Sachin** ([Sachin Jatavat](https://github.com/sachinjatavat))
- **Repository**: [https://github.com/sachinjatavat/Screen-Vibes](https://github.com/sachinjatavat/Screen-Vibes)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Feel free to customize and enjoy your ambient desktop lighting!
