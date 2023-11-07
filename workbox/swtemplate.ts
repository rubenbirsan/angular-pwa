import { skipWaiting, clientsClaim } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import {
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  CacheOnly,
  StaleWhileRevalidate,
} from 'workbox-strategies';
import { Queue } from 'workbox-background-sync';
import { Book } from '../src/app/book';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { PrecacheController } from 'workbox-precaching';
import { BehaviorSubject, timeInterval, window } from 'rxjs';
import { liveQuery } from 'dexie';
import { requestsDatabase } from './db/db';

declare var self: ServiceWorkerGlobalScope;

skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

const appIsOnline$ = new BehaviorSubject<boolean>(false);
const syncIsPending$ = new BehaviorSubject<boolean>(false);

self.addEventListener('activate', async (event) => {
  await checkOnlineStatus();
});

setTimeout(async () => {
  await checkOnlineStatus();
}, 500);

const checkOnlineStatus = async () => {
  try {
    var itemFromLocalStorage = '';
    var pingAddress = 'https://api.ipify.org';
    if (itemFromLocalStorage) {
      pingAddress += '?token=' + itemFromLocalStorage;
    }
    await fetch(pingAddress).then((success) => {
      sendMessageToClient('online');
      appIsOnline$.next(true);
    });
  } catch (err) {
    sendMessageToClient('offline');
    appIsOnline$.next(false);
  }
};

setInterval(async () => {
  if (
    appIsOnline$.value &&
    (await requestsDatabase.listPendingBookRequests()).length > 0 &&
    syncIsPending$.value === false
  ) {
    syncPendingRequests();
  }

  // if ((await requestsDatabase.listPendingBookRequests()).length === 0) {
  //   syncIsPending$.next(false);
  // }
}, 5000);

setInterval(async () => {
  await checkOnlineStatus();
}, 5000);

const syncPendingRequests = async () => {
  syncIsPending$.next(true);
  var itemsForRequest = await requestsDatabase.listPendingBookRequests();
  if (itemsForRequest.length == 0) {
    console.log('No offline saved books found');
    syncIsPending$.next(false);
  } else {
    console.log('Offline saved books found: ', itemsForRequest.length);
    itemsForRequest.forEach((book, index) => {
      setTimeout(async () => {
        await requestsDatabase.setBookRequestInitiated(book.id, true);
        fetch(book.requestUrl + (book.method == 'PUT' ? '/' + book.isbn : ''), {
          method: book.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(book),
        })
          .then(async (response) => {
            if (!response.ok) {
              await requestsDatabase.setBookRequestInitiated(book.id, false);

              if (index === itemsForRequest.length - 1) {
                await sendMessageToClient('loadBooks');
                syncIsPending$.next(false);
              }
              throw new Error('Network response was not ok');
            }
            if (index === itemsForRequest.length - 1) {
              syncIsPending$.next(false);
              await sendMessageToClient('loadBooks');
            }
            return response.json();
          })
          .then(async (data) => {
            console.log(
              'Index: ',
              index,
              ', Items length: ',
              itemsForRequest.length
            );
            if (index === itemsForRequest.length - 1) {
              syncIsPending$.next(false);
              await sendMessageToClient('loadBooks');
            }
            await requestsDatabase.deleteBookRequest(book.id);
          })
          .catch(async (error) => {
            await requestsDatabase.setBookRequestInitiated(book.id, false);
            if (index === itemsForRequest.length - 1) {
              await sendMessageToClient('loadBooks');
            }
          });
      }, index * 2000);
    });
  }
};

const cacheStorageUpdatePlugin = {
  fetchDidFail: async ({ request }) => {
    try {
      const response = await fetch(request.clone());

      return response;
    } catch (error) {
      const requestBody = await request.text();
      const book = JSON.parse(requestBody) as Book;
      const urlToRetrieve = 'https://api.angular.schule/books';

      let createdBook = await requestsDatabase.getBookRequestByIsbn(book.isbn);

      await requestsDatabase.addBookRequest(
        urlToRetrieve,
        book,
        createdBook ? 'PUT' : 'POST'
      );

      caches.open('books').then(function (cache) {
        cache
          .match(new Request(urlToRetrieve))
          .then(function (response) {
            if (response) {
              response
                .json()
                .then(function (data) {
                  cache
                    .put(
                      urlToRetrieve,
                      new Response(
                        JSON.stringify([
                          ...data.filter((d) => d.isbn != book.isbn),
                          book,
                        ])
                      )
                    )
                    .then(function () {})
                    .catch(function (error) {});
                })
                .catch(function (error) {});
            } else {
              let books: Book[] = [];
              books.push(book);
              cache
                .put(urlToRetrieve, new Response(JSON.stringify(books)))
                .then(function () {})
                .catch(function (error) {
                  // Handle any errors here
                });
            }
          })
          .catch(function (error) {
            // Handle any errors here
          });
      });

      return error;
    }
  },
};

const bgGetPlugin = {
  cacheWillUpdate: async ({ request, response, event, state }) => {
    // Return `response`, a different `Response` object, or `null`.
    return response;
  },
  cacheDidUpdate: async ({
    cacheName,
    request,
    oldResponse,
    newResponse,
    event,
    state,
  }) => {
    // No return expected
    // Note: `newResponse.bodyUsed` is `true` when this is called,
    // meaning the body has already been read. If you need access to
    // the body of the fresh response, use a technique like:
    // const freshResponse = await caches.match(request, {cacheName});
  },
  cacheKeyWillBeUsed: async ({ request, mode, params, event, state }) => {
    // `request` is the `Request` object that would otherwise be used as the cache key.
    // `mode` is either 'read' or 'write'.
    // Return either a string, or a `Request` whose `url` property will be used as the cache key.
    // Returning the original `request` will make this a no-op.
    return request;
  },
  cachedResponseWillBeUsed: async ({
    cacheName,
    request,
    matchOptions,
    cachedResponse,
    event,
    state,
  }) => {
    // Return `cachedResponse`, a different `Response` object, or null.
    return cachedResponse;
  },
  requestWillFetch: async ({ request, event, state }) => {
    // Return `request` or a different `Request` object.
    return request;
  },
  fetchDidFail: async ({ originalRequest, request, error, event, state }) => {
    try {
      var date = new Date();

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      const formattedDate = `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;

      const urlToRetrieve = 'https://api.angular.schule/books/' + formattedDate;

      let books: Book[] = [];

      for (let i = 0; i < 200000; i++) {
        books.push({
          isbn: '9783864905521' + i,
          title: 'React1',
          published: new Date(),
          price: 22,
          addedOffline: true,
          rating: 2,
        });
      }

      console.log('Books to add in cache: ', books.length);

      caches.open('books' + formattedDate).then(function (cache) {
        cache
          .put(urlToRetrieve, new Response(JSON.stringify(books)))
          .then(function () {
            console.log('Success - Books added in Cache');
          })
          .catch(function (error) {
            console.log('Fail1', ' -  Books added in Cache', error);
          });
      });
    } catch (error) {
      console.log('Fail2', ' -  Books added in Cache', error);

      return error;
    }
  },
  fetchDidSucceed: async ({ request, response, event, state }) => {
    // Return `response` to use the network response as-is,
    // or alternatively create and return a new `Response` object.

    return response;
  },
  handlerWillStart: async ({ request, event, state }) => {
    // No return expected.
    // Can set initial handler state here.
  },
  handlerWillRespond: async ({ request, response, event, state }) => {
    // Return `response` or a different `Response` object.
    return response;
  },
  handlerDidRespond: async ({ request, response, event, state }) => {
    // No return expected.
    // Can record final response details here.
  },
  handlerDidComplete: async ({ request, response, error, event, state }) => {
    // No return expected.
    // Can report any data here.
  },
  handlerDidError: async ({ request, event, error, state }) => {
    // Return a `Response` to use as a fallback, or `null`.

    return null;
  },
};

const bgPostPlugin = {
  cacheWillUpdate: async ({ request, response, event, state }) => {
    // Return `response`, a different `Response` object, or `null`.
    return response;
  },
  cacheDidUpdate: async ({
    cacheName,
    request,
    oldResponse,
    newResponse,
    event,
    state,
  }) => {
    // No return expected
    // Note: `newResponse.bodyUsed` is `true` when this is called,
    // meaning the body has already been read. If you need access to
    // the body of the fresh response, use a technique like:
    // const freshResponse = await caches.match(request, {cacheName});
  },
  cacheKeyWillBeUsed: async ({ request, mode, params, event, state }) => {
    // `request` is the `Request` object that would otherwise be used as the cache key.
    // `mode` is either 'read' or 'write'.
    // Return either a string, or a `Request` whose `url` property will be used as the cache key.
    // Returning the original `request` will make this a no-op.
    return request;
  },
  cachedResponseWillBeUsed: async ({
    cacheName,
    request,
    matchOptions,
    cachedResponse,
    event,
    state,
  }) => {
    // Return `cachedResponse`, a different `Response` object, or null.
    return cachedResponse;
  },
  requestWillFetch: async ({ request, event, state }) => {
    // Return `request` or a different `Request` object.
    return request;
  },
  fetchDidFail: async ({ originalRequest, request, error, event, state }) => {
    // No return expected.
    // Note: `originalRequest` is the browser's request, `request` is the
    // request after being passed through plugins with
    // `requestWillFetch` callbacks, and `error` is the exception that caused
    // the underlying `fetch()` to fail.

    // queue.pushRequest({ request: event.request });

    appIsOnline$.next(false);
    console.log('Add book failed');
  },
  fetchDidSucceed: async ({ request, response, event, state }) => {
    // Return `response` to use the network response as-is,
    // or alternatively create and return a new `Response` object.

    return response;
  },
  handlerWillStart: async ({ request, event, state }) => {
    // No return expected.
    // Can set initial handler state here.
  },
  handlerWillRespond: async ({ request, response, event, state }) => {
    // Return `response` or a different `Response` object.
    return response;
  },
  handlerDidRespond: async ({ request, response, event, state }) => {
    // No return expected.
    // Can record final response details here.
  },
  handlerDidComplete: async ({ request, response, error, event, state }) => {
    // No return expected.
    // Can report any data here.
  },
  handlerDidError: async ({ request, event, error, state }) => {
    // Return a `Response` to use as a fallback, or `null`.

    return null;
  },
};

registerRoute(
  ({ url }) => url.pathname.endsWith('/books'),
  new NetworkFirst({
    cacheName: 'books',
    plugins: [bgGetPlugin],
  }),
  'GET'
);

registerRoute(
  ({ url }) => url.pathname.endsWith('/books'),
  new NetworkOnly({ plugins: [bgPostPlugin, cacheStorageUpdatePlugin] }),
  'POST'
);

registerRoute(
  ({ url }) => url.pathname.endsWith('/items'),
  new NetworkOnly({ plugins: [bgPostPlugin, cacheStorageUpdatePlugin] }),
  'POST'
);

registerRoute(
  ({ url }) => url.pathname.endsWith('/indexedDb'),
  new CacheOnly({
    plugins: [
      {
        cachedResponseWillBeUsed: async () => {
          var data = await requestsDatabase.listBookRequests();
          const response = new Response(JSON.stringify(data), {
            headers: {
              'Content-Type': 'application/json',
            },
          });
          return response;
        },
      },
    ],
  }),
  'GET'
);

const sendMessageToClient = async (action: string) => {
  const clientList = await self.clients.matchAll();
  for (const client of clientList) {
    if (client.type === 'window') {
      client.postMessage({ action: action });
    }
  }
};

self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'setAccessToken') {
    console.log('Received data from Component: ', event.data);
  }
});
