import React from 'react';
import { hot } from 'react-hot-loader/root';
import { Router } from 'react-router';
import { ApolloProvider } from '@apollo/client';
import { createBrowserHistory } from 'history';
import Routes from '../Routes';
import client from '../utils/appoloClient';

const history = createBrowserHistory();

const Root = () => (
  <ApolloProvider client={client}>
    <Router history={history}>
      <Routes />
    </Router>
  </ApolloProvider>
);

export default hot(Root);
