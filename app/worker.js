const { ipcRenderer } = require('electron');
const postQuery = require('./worker/index');

ipcRenderer.on('graphql-to-worker', async (_, payload) => postQuery(payload));
