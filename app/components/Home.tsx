import React, { useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/react-hooks';
import gql from 'graphql-tag';
import { ipcRenderer } from 'electron';

import styles from './Home.css';

const booksGQL = gql`
  query books {
    books {
      id
      title
    }
  }
`;

const moviesGQL = gql`
  query movies {
    movies {
      id
      title
    }
  }
`;

const addBookGQL = gql`
  mutation addBook($title: String!) {
    addBook(title: $title) {
      id
      title
    }
  }
`;

const handleAddBook = (addBook) => {
  addBook({ variables: { title: Math.random().toString(36).substring(7) } });
};

ipcRenderer.on('message-from-worker', (event: any, payload: any) => {
  console.debug({ event, payload });
});

export default function Home(): JSX.Element {
  const { data: b } = useQuery(booksGQL);
  const { data: m } = useQuery(moviesGQL);
  const [addBook] = useMutation(addBookGQL, {
    update(cache, { data: { addBook: data } }) {
      cache.modify({
        fields: {
          books(existingBooks = []) {
            ipcRenderer.send('message-to-worker', 'message_from_home');

            const newBookRef = cache.writeFragment({
              data,
              fragment: gql`
                fragment NewBook on Book {
                  id
                  title
                }
              `,
            });
            return [...existingBooks, newBookRef];
          },
        },
      });
    },
  });

  if (!b || !m) return <p>loading</p>;
  return (
    <div className={styles.container} data-tid="container">
      <div className={styles.card}>
        <h2>Books</h2>
        {b.books.map(({ title }) => (
          <p key={title}>{title}</p>
        ))}
        <button onClick={() => handleAddBook(addBook)} type="submit">
          Add Book
        </button>
      </div>
      <div className={styles.card}>
        <h2>movies</h2>
        {m.movies.map(({ title }) => (
          <p key={title}>{title}</p>
        ))}
      </div>
    </div>
  );
}
