# Screen Vibes ✨

Ambient RGB Edge-Lighting & Music Visualizer for Windows laptops and monitors.

## Features

### 💫 Continuous Traveling Light Wave
- **Full Perimeter Circulation**: Continuous light wave traveling smoothly along the top, right, bottom, and left edges of the screen.
- **Luminous Head & Glowing Trail**: Intense bright comet head with a smooth exponential fade trail and volumetric inward ambient diffusion.
- **Direction Controls**:
  - **Clockwise (↻)**: Wave travels clockwise around all 4 edges.
  - **Anticlockwise (↺)**: Wave travels in the reverse direction.
  - **Reverse Direction (⇄)**: Instantly inverts the current direction without resetting position or restarting.
- **Interactive Live Preview**: Miniature real-time laptop screen preview right inside the settings panel.
- **Deep Customization**:
  - Animation speed (0.2x – 3.0x)
  - Wave length & trail length (10% – 80%)
  - Glow intensity (20% – 200%)
  - Border thickness (4px – 50px)
  - Color Modes: RGB Rainbow spectrum, Dual gradient, Head + Trail, Solid neon, or Synced with audio colors
  - Master Enable/Disable toggle
- **Smooth Corner Transitions**: Seamless corner vertex interpolation with zero gaps or sharp discontinuities.
- **Multi-Monitor & DPI Scaling**: Supports high-DPI displays (125%, 150%, 200% laptop screens) and multi-monitor setups.
- **Click-Through Transparent Overlay**: Completely non-intrusive; passes all mouse clicks and keyboard events through to Windows and desktop applications.

### 🎵 Audio Reactive Edge Visualizer
- System audio loopback (Spotify, YouTube, games, media players).
- Multiple visualizer styles: Bars, Wave, Glow, Pulse (bass).
- Customizable colors, sensitivity, size, smoothing, and edge toggles.

---

## How to Run

1. Open terminal in this folder:
   ```bash
   npm install
   npm start
   ```
2. Open Settings anytime from the system tray icon or app window.
3. Use the tray icon to quickly toggle the light wave, reverse direction, or show/hide overlays.

---

## Architecture

- `main.js`: Multi-display overlay window manager, system tray controls, system audio loopback handler, settings storage.
- `overlay.html` & `overlay.js`: Fullscreen transparent canvas overlay with continuous perimeter wave math, corner interpolation, ambient inward diffusion, and audio visualizer.
- `panel.html` & `panel.js`: Modern glassmorphic settings panel with real-time live preview canvas, direction controls, presets, and customization sliders.
- `preload.js`: Secure IPC bridge between Electron and UI windows.
