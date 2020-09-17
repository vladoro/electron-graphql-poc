const { ipcRenderer } = require('electron');
const { serializeError } = require('serialize-error');

const {
  ApolloLink,
  Observable,
  serializeFetchParameter,
  selectURI,
  parseAndCheckHttpResponse,
  checkFetcher,
  selectHttpOptionsAndBody,
  fallbackHttpConfig,
  createSignalIfSupported,
  rewriteURIForGET,
  fromError,
} = require('@apollo/client');

const sendMessageToRenderer = (ipcId, result, error) => {
  const response = result || {};
  if (error) {
    response.error = serializeError(error);
  }
  console(response);
  ipcRenderer.send('graphql-from-worker', { ...response, ipcId });
  return result;
};

const createIpcLink = (linkOptions = {}) => {
  const {
    uri = '/graphql',
    // use default global fetch if nothing passed in
    includeExtensions,
    useGETForQueries,
    ...requestOptions
  } = linkOptions;

  let { fetch: fetcher } = linkOptions;

  // dev warnings to ensure fetch is present
  checkFetcher(fetcher);

  // fetcher is set here rather than the destructuring to ensure fetch is
  // declared before referencing it. Reference in the destructuring would cause
  // a ReferenceError
  if (!fetcher) {
    fetcher = fetch;
  }

  const linkConfig = {
    http: { includeExtensions },
    options: requestOptions.fetchOptions,
    credentials: requestOptions.credentials,
    headers: requestOptions.headers,
  };

  return new ApolloLink((operation) => {
    let chosenURI = selectURI(operation, uri);

    const context = operation.getContext();

    const { ipcId } = context;

    if (!ipcId) {
      const error = new Error('Ipc Renderer message id mising');
      const result = fromError(error);
      sendMessageToRenderer(null, {}, error);
      return result;
    }

    // `apollographql-client-*` headers are automatically set if a
    // `clientAwareness` object is found in the context. These headers are
    // set first, followed by the rest of the headers pulled from
    // `context.headers`. If desired, `apollographql-client-*` headers set by
    // the `clientAwareness` object can be overridden by
    // `apollographql-client-*` headers set in `context.headers`.
    const clientAwarenessHeaders = {};

    if (context.clientAwareness) {
      const { name, version } = context.clientAwareness;
      if (name) {
        clientAwarenessHeaders['apollographql-client-name'] = name;
      }
      if (version) {
        clientAwarenessHeaders['apollographql-client-version'] = version;
      }
    }

    const contextHeaders = { ...clientAwarenessHeaders, ...context.headers };

    const contextConfig = {
      http: context.http,
      options: context.fetchOptions,
      credentials: context.credentials,
      headers: contextHeaders,
    };

    // uses fallback, link, and then context to build options
    const { options, body } = selectHttpOptionsAndBody(
      operation,
      fallbackHttpConfig,
      linkConfig,
      contextConfig
    );

    let controller;
    if (!options.signal) {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { controller: _controller, signal } = createSignalIfSupported();
      controller = _controller;
      if (controller) options.signal = signal;
    }

    // If requested, set method to GET if there are no mutations.
    const definitionIsMutation = (d) => {
      return d.kind === 'OperationDefinition' && d.operation === 'mutation';
    };
    if (
      useGETForQueries &&
      !operation.query.definitions.some(definitionIsMutation)
    ) {
      options.method = 'GET';
    }

    if (options.method === 'GET') {
      const { newURI, parseError } = rewriteURIForGET(chosenURI, body);
      if (parseError) {
        const result = fromError(parseError);
        sendMessageToRenderer(ipcId, {}, parseError);
        return result;
      }
      chosenURI = newURI;
    } else {
      try {
        options.body = serializeFetchParameter(body, 'Payload');
      } catch (parseError) {
        const result = fromError(parseError);
        sendMessageToRenderer(ipcId, {}, parseError);
        return result;
      }
    }

    return new Observable((observer) => {
      if (!fetcher) return null;

      fetcher(chosenURI, options)
        .then((response) => {
          operation.setContext({ response });
          return response;
        })
        .then(parseAndCheckHttpResponse(operation))
        .then((result) => {
          // we have data and can send it to back up the link chain
          observer.next(result);
          observer.complete();

          sendMessageToRenderer(ipcId, result);
          return result;
        })
        .catch((err) => {
          // fetch was cancelled so it's already been cleaned up in the unsubscribe
          if (err.name === 'AbortError') {
            sendMessageToRenderer(ipcId, {}, err);
            return;
          }

          let result = {};

          // if it is a network error, BUT there is graphql result info
          // fire the next observer before calling error
          // this gives apollo-client (and react-apollo) the `graphqlErrors` and `networErrors`
          // to pass to UI
          // this should only happen if we *also* have data as part of the response key per
          // the spec
          if (err.result && err.result.errors && err.result.data) {
            // if we don't call next, the UI can only show networkError because AC didn't
            // get any graphqlErrors
            // this is graphql execution result info (i.e errors and possibly data)
            // this is because there is no formal spec how errors should translate to
            // http status codes. So an auth error (401) could have both data
            // from a public field, errors from a private field, and a status of 401
            // {
            //  user { // this will have errors
            //    firstName
            //  }
            //  products { // this is public so will have data
            //    cost
            //  }
            // }
            //
            // the result of above *could* look like this:
            // {
            //   data: { products: [{ cost: "$10" }] },
            //   errors: [{
            //      message: 'your session has timed out',
            //      path: []
            //   }]
            // }
            // status code of above would be a 401
            // in the UI you want to show data where you can, errors as data where you can
            // and use correct http status codes
            observer.next(err.result);
            result = err.result;
          }
          observer.error(err);
          sendMessageToRenderer(ipcId, result, err);
        });

      return () => {
        // XXX support canceling this request
        // https://developers.google.com/web/updates/2017/09/abortable-fetch
        if (controller) controller.abort();
      };
    });
  });
};

module.exports = createIpcLink;
