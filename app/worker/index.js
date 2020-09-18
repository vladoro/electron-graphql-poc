const { ApolloLink } = require('@apollo/client');
const { setContext } = require('apollo-link-context');

const electron = require('electron');

const { remote } = electron;

const createIpcLink = require('./IpcLink');

const uri = remote.process.env.GRAPHQL_HOST || 'http://localhost:4000';

const ipcLink = createIpcLink({ uri });

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('access_token');

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const link = authLink.concat(ipcLink);

const postQueryApollo = ({ ipcId, request }) => {
  const newRequest = {
    ...request,
    context: { ipcId },
  };
  const observer = ApolloLink.execute(link, newRequest);

  observer.subscribe({
    error(err) {
      console.error(`Finished with error: ${err}`);
    },
    complete() {
      console.debug('Finished');
    },
  });
};

module.exports = postQueryApollo;
