const { ipcRenderer } = require('electron');
// const { serializeError } = require('serialize-error');

ipcRenderer.on('graphql-to-worker', (_, payload) => {
  const { id, request } = payload;
  // console.debug(payload);

  let data;

  const { operationName } = request;
  if (operationName === 'addBook') {
    data = {
      [operationName]: {
        __typename: 'book',
        id: 'newBook',
        title: 'Super new title',
      },
    };
  } else {
    const typename = operationName.slice(0, operationName.length - 1);
    data = {
      [operationName]: [
        {
          __typename: typename,
          id: 'superId',
          title: 'Super title',
        },
      ],
    };
  }

  ipcRenderer.send('graphql-from-worker', { id, data });
});
