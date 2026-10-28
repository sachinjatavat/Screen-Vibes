const { app, BrowserWindow, Tray, Menu, ipcMain, screen, session, desktopCapturer, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// 1. Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

const DEFAULTS = {
  // Audio reactive settings
  mode: 'bars',          // bars | wave | glow | pulse | none
  color1: '#00f5ff',
  color2: '#ff00e5',
  rainbow: false,
  sensitivity: 1.3,
  thickness: 140,
  smoothing: 0.7,
  edges: { top: true, bottom: true, left: true, right: true },

  // Traveling Light Wave settings
  waveEnabled: true,
  waveDirection: 'cw',       // 'cw' | 'ccw'
  waveSpeed: 1.0,            // 0.2 to 3.0
  waveLength: 0.35,          // 0.10 to 0.80
  waveGlow: 1.0,             // 0.2 to 2.0
  waveThickness: 18,         // 4 to 50 px
  waveColorMode: 'rainbow',  // 'rainbow' | 'gradient' | 'head-trail' | 'solid' | 'sync'
  waveColor1: '#00f5ff',
  waveColor2: '#ff00e5',
  waveHeadColor: '#ffffff',
  displayMode: 'all',        // 'all' | 'primary'
  autoStart: false,
};

let settings = { ...DEFAULTS };
let overlayWindows = [];
let panel = null;
let tray = null;
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
const logFile = () => path.join(app.getPath('userData'), 'debug.log');

function writeLog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(logFile(), line);
  } catch {}
}

function loadSettings() {
  try {
    const saved = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
    settings = {
      ...DEFAULTS,
      ...saved,
      edges: { ...DEFAULTS.edges, ...(saved.edges || {}) }
    };
  } catch {
    settings = { ...DEFAULTS };
  }
}

function saveSettings() {
  try {
    fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
  } catch (err) {
    writeLog('saveSettings error: ' + err.message);
  }
}

function setAutoStart(enable) {
  settings.autoStart = enable;
  saveSettings();
  try {
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: process.execPath,
      args: ['--hidden'],
    });
    writeLog(`setAutoStart set to ${enable}`);
  } catch (err) {
    writeLog(`setAutoStart error: ${err.message}`);
  }
}

function broadcastSettings() {
  for (const win of overlayWindows) {
    if (!win.isDestroyed()) {
      win.webContents.send('settings', settings);
    }
  }
  if (panel && !panel.isDestroyed()) {
    panel.webContents.send('settings', settings);
  }
  updateTrayMenu();
}

function createOverlays() {
  writeLog('createOverlays() called');
  // Clean up existing overlays
  for (const win of overlayWindows) {
    if (!win.isDestroyed()) win.destroy();
  }
  overlayWindows = [];

  const primaryDisplay = screen.getPrimaryDisplay();
  const displays = (settings.displayMode === 'primary')
    ? [primaryDisplay]
    : screen.getAllDisplays();

  for (const display of displays) {
    const { x, y, width, height } = display.bounds; // covers entire display including taskbar area!
    writeLog(`Creating overlay for display ${display.id}: ${width}x${height} at (${x}, ${y}) scale=${display.scaleFactor}`);

    const win = new BrowserWindow({
      x, y, width, height,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      hasShadow: false,
      focusable: false,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        backgroundThrottling: false, // Maintain 60+ FPS when overlay is in background
        autoplayPolicy: 'no-user-gesture-required', // Allow AudioContext to start without click
      },
    });

    // Explicitly set bounds to ensure complete taskbar/screen coverage on Windows
    win.setBounds({ x, y, width, height });
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.setIgnoreMouseEvents(true, { forward: true }); // Click-through
    win.loadFile('overlay.html');
    overlayWindows.push(win);
  }
}

function createPanel(shouldShow = true) {
  if (panel && !panel.isDestroyed()) {
    if (shouldShow) {
      if (panel.isMinimized()) panel.restore();
      panel.show();
      panel.focus();
    }
    return;
  }

  panel = new BrowserWindow({
    width: 520,
    height: 880,
    minWidth: 440,
    minHeight: 650,
    resizable: true,
    show: shouldShow,
    autoHideMenuBar: true,
    title: 'Screen Vibes - Developed By Sachin',
    backgroundColor: '#1c1c2b',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });

  panel.loadFile('panel.html');
  panel.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      panel.hide();
    }
  });
}

function toggleOverlays() {
  const anyVisible = overlayWindows.some((w) => !w.isDestroyed() && w.isVisible());
  for (const w of overlayWindows) {
    if (!w.isDestroyed()) {
      if (anyVisible) w.hide();
      else w.showInactive();
    }
  }
}

function updateTrayMenu() {
  if (!tray || tray.isDestroyed()) return;
  const currentDir = settings.waveDirection || 'cw';
  const dirLabel = currentDir === 'dual' 
    ? 'Dual Waves Intersecting (⇄)' 
    : (currentDir === 'ccw' ? 'Anticlockwise (↺)' : 'Clockwise (↻)');

  const menu = Menu.buildFromTemplate([
    { label: 'Screen Vibes - Developed By Sachin', click: () => { createPanel(true); } },
    { type: 'separator' },
    {
      label: 'Traveling Light Wave',
      type: 'checkbox',
      checked: !!settings.waveEnabled,
      click: (item) => {
        settings.waveEnabled = item.checked;
        saveSettings();
        broadcastSettings();
      },
    },
    {
      label: `Direction: ${dirLabel}`,
      click: () => {
        if (settings.waveDirection === 'cw') settings.waveDirection = 'ccw';
        else if (settings.waveDirection === 'ccw') settings.waveDirection = 'dual';
        else settings.waveDirection = 'cw';
        saveSettings();
        broadcastSettings();
      },
    },
    {
      label: 'Dual Waves (⇄ Intersecting)',
      type: 'checkbox',
      checked: settings.waveDirection === 'dual',
      click: (item) => {
        settings.waveDirection = item.checked ? 'dual' : 'cw';
        saveSettings();
        broadcastSettings();
      },
    },
    { type: 'separator' },
    {
      label: 'Start with Windows',
      type: 'checkbox',
      checked: !!settings.autoStart,
      click: (item) => {
        setAutoStart(item.checked);
        updateTrayMenu();
        if (panel && !panel.isDestroyed()) panel.webContents.send('settings', settings);
      },
    },
    {
      label: 'Open Debug Log',
      click: () => {
        const lf = logFile();
        if (!fs.existsSync(lf)) fs.writeFileSync(lf, 'Screen Vibes Debug Log\n');
        shell.openPath(lf);
      },
    },
    { label: 'Show / Hide All Vibes', click: () => toggleOverlays() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(menu);
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Screen Vibes - Ambient Light & Audio Wave');
  updateTrayMenu();
  tray.on('click', () => { createPanel(true); });
}

let displayChangeTimer = null;
function handleDisplayChange() {
  clearTimeout(displayChangeTimer);
  displayChangeTimer = setTimeout(() => {
    writeLog('Recreating overlays after display configuration or metrics changed');
    createOverlays();
  }, 400);
}

app.on('second-instance', () => {
  createPanel(true);
});

app.whenReady().then(() => {
  loadSettings();
  try {
    fs.writeFileSync(logFile(), `=== Screen Vibes Started [${new Date().toISOString()}] ===\nVersion: 1.0.0\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}\n`);
  } catch {}

  // System audio loopback capture handler
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    writeLog('setDisplayMediaRequestHandler triggered');
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      writeLog(`desktopCapturer sources count: ${sources.length}`);
      callback({ video: sources[0], audio: 'loopback' });
    }).catch((err) => {
      writeLog('desktopCapturer error: ' + err.message);
      callback({});
    });
  });

  ipcMain.handle('settings:get', () => settings);
  ipcMain.on('settings:set', (_, s) => {
    const prevDisplayMode = settings.displayMode;
    const prevAutoStart = settings.autoStart;
    settings = s;
    saveSettings();

    if (prevAutoStart !== settings.autoStart) {
      setAutoStart(!!settings.autoStart);
    }
    if (prevDisplayMode !== settings.displayMode) {
      createOverlays();
    }
    broadcastSettings();
  });

  ipcMain.on('log:write', (_, msg) => {
    writeLog(msg);
  });

  screen.on('display-added', handleDisplayChange);
  screen.on('display-removed', handleDisplayChange);
  screen.on('display-metrics-changed', (event, display, changedMetrics) => {
    writeLog(`display-metrics-changed: ${JSON.stringify(changedMetrics || [])}`);
    handleDisplayChange();
  });

  createOverlays();

  // If started with --hidden (e.g. login autostart), do not show panel initially
  const isHiddenLaunch = process.argv.includes('--hidden');
  createPanel(!isHiddenLaunch);
  createTray();
});

app.on('window-all-closed', () => {}); // Keep running in tray
