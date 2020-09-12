/* eslint react/jsx-props-no-spreading: off */
import React from 'react';
import { Switch, Route } from 'react-router-dom';
import App from './containers/App';
import HomePage from './containers/HomePage';

export default function Routes() {
  return (
    <App>
      <Switch>
        <Route path="/" component={HomePage} />
      </Switch>
    </App>
  );
}
