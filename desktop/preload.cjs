const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kidoDesktop', {
  quit: () => ipcRenderer.send('kido:quit'),
});
