const { ipcRenderer } = require('electron');

ipcRenderer.on('message-to-worker', (event, payload) => {
  console.debug(payload);

  ipcRenderer.send('message-from-worker', payload);
});
