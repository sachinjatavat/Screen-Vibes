const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('vibe', {
  get: () => ipcRenderer.invoke('settings:get'),
  set: (s) => ipcRenderer.send('settings:set', s),
  onChange: (cb) => ipcRenderer.on('settings', (_, s) => cb(s)),
  log: (msg) => ipcRenderer.send('log:write', msg),
});
