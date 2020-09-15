import { ApolloClient, InMemoryCache } from '@apollo/client';

import { IpcLink } from './IpcLink';

// const uri = 'http://localhost:4000/';

const link = new IpcLink({});

const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});

export default client;
