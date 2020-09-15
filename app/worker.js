const { ipcRenderer } = require('electron');
const postQuery = require('./worker/index');

ipcRenderer.on('graphql-to-worker', async (_, payload) => {
  const { id, request } = payload;

  await postQuery(request).then((response) => {
    const { data } = response;
    return ipcRenderer.send('graphql-from-worker', { id, data });
  });
});
