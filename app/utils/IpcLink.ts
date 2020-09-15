import { ApolloLink, Observable, Operation, FetchResult } from '@apollo/client';
import { ipcRenderer, IpcRenderer } from 'electron';
import { print } from 'graphql';
import { ZenObservable } from 'zen-observable-ts';
import { deserializeError } from 'serialize-error';

export interface ApolloIpcLinkOptions {
  channel?: string;
  ipc: IpcRenderer;
}

export interface SerializableGraphQLRequest {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

const RANDOM_ID = Math.random().toString(36);

export class IpcLink extends ApolloLink {
  private ipc: IpcRenderer;

  private counter = 0;

  private channel = 'graphql';

  private observers: Map<
    string,
    ZenObservable.SubscriptionObserver<FetchResult>
  > = new Map();

  constructor(options: ApolloIpcLinkOptions) {
    super();

    this.ipc = options.ipc || ipcRenderer;
    if (typeof options.channel !== 'undefined') {
      this.channel = options.channel;
    }

    this.ipc.on(`graphql-from-worker`, this.onResponse);
  }

  public request(
    operation: Operation
    // forward?: NextLink
  ): Observable<FetchResult> | null {
    return new Observable(
      (observer: ZenObservable.SubscriptionObserver<FetchResult>) => {
        this.counter += 1;
        const id = `${RANDOM_ID}-${this.counter}`;
        const { operationName, query, variables } = operation;
        const request: SerializableGraphQLRequest = {
          operationName,
          variables,
          query: print(query),
        };
        this.observers.set(id, observer);
        this.ipc.send(`graphql-to-worker`, { id, request });
      }
    );
  }

  protected onResponse = (_: any, response: any) => {
    const { id, data, error } = response;
    const observer = this.observers.get(id);

    if (!observer) {
      console.error(`Missing observer for query id ${id}.`);
      return;
    }
    if (data) {
      observer.next({ data });
      observer.complete();
    } else if (error) {
      observer.error(deserializeError(error));
    }
    this.observers.delete(id);
  };

  public dispose() {
    this.ipc.removeListener(this.channel, this.onResponse);
  }
}
