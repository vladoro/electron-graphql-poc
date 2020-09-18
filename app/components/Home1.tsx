import React, { MouseEvent, useState } from 'react';
import { useQuery, useMutation } from '@apollo/react-hooks';
import gql from 'graphql-tag';

import styles from './Home.css';

const loginGQL = gql`
  mutation login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      accessToken
      lastConnection
    }
  }
`;

const meGQL = gql`
  query me {
    me {
      id
      firstName
      lastName
      places {
        id
        name
      }
    }
  }
`;

export default function Home(): JSX.Element {
  const [login] = useMutation(loginGQL, {
    // eslint-disable-next-line no-restricted-globals
    onCompleted: (data) => location.reload(),
  });
  const { data } = useQuery(meGQL, { fetchPolicy: 'network-only' });

  let email;
  let password;

  const { me } = data || {};
  const { firstName, places } = me || {};

  const handleLogin = (event: MouseEvent) => {
    event.preventDefault();
    login({ variables: { email: email.value, password: password.value } });
  };

  return (
    <div className={styles.container} data-tid="container">
      {!firstName && (
        <div className={styles.card}>
          <h2>Login</h2>
          <input
            type="email"
            name="email"
            ref={(i) => {
              email = i;
            }}
          />
          <br />
          <input
            type="password"
            name="password"
            ref={(i) => {
              password = i;
            }}
          />
          <br />
          <button onClick={handleLogin} type="submit">
            Login
          </button>
        </div>
      )}
      {firstName && (
        <div>
          <h2>{firstName}</h2>
          <ul>
            {places.map(({ name }) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
