// const { createHttpLink } = require('@apollo/client');
// const { serializeError } = require('serialize-error');

const uri = `http://localhost:4000`;

const postQuery = async ({ query, variables }) =>
  fetch(uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })
    .then((r) => r.json())
    .catch((error) => ({ errors: [error.message] }));

module.exports = postQuery;
