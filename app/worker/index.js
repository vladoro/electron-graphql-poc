const { ApolloLink } = require('@apollo/client');

const createIpcLink = require('./IpcLink');

const uri = `http://localhost:4000`;

const httpLink = createIpcLink({ uri });

const link = httpLink;

const postQueryApollo = ({ ipcId, request }) => {
  const newRequest = {
    ...request,
    context: { ipcId },
  };
  const observer = ApolloLink.execute(link, newRequest);

  observer.subscribe({
    next(x) {
      console.log(x);
    },
    error(err) {
      console.log(`Finished with error: ${err}`);
    },
    complete() {
      console.log('Finished');
    },
  });
};

module.exports = postQueryApollo;
