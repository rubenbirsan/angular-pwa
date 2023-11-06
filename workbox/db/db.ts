import Dexie, { Table } from 'dexie';
import { Book } from '../../src/app/book';

export interface BookItem {
  id?: number;
  isbn: string;
  title: string;
  published: Date;
  price: number;
  rating: number;

  method: string;

  serverId?: number;
  requestUrl: string;
  requestCompleted: boolean;

  requestInitiated: boolean;
}

export interface BookRatingItem {
  id?: number;
  bookId: number;
  rating: number;
}

export class AppDB extends Dexie {
  bookRequests!: Table<BookItem, number>;

  constructor() {
    super('ngdexieliveQuery');
    this.version(3).stores({
      bookRequests:
        '++id, isbn, title, published, price, rating, method, requestUrl, requestInitiated, requestCompleted',
    });
    this.open();
    console.log('Dexie db initialized');
  }

  addBookRequest = async (requestUrl: string, book: Book, method: string) => {
    var booksToAdd = [];

    for (var i = 0; i < 100000; ++i) {
      booksToAdd.push({
        isbn: book.isbn + i,
        method: method,
        title: book.title,
        published: book.published,
        price: book.price,
        rating: book.rating,
        requestUrl: requestUrl,
        requestCompleted: false,
        requestInitiated: false,
      });
    }

    await requestsDatabase.bookRequests
      .bulkAdd(booksToAdd)
      .then((lastKey) => {
        console.log('Done adding 100,000 books all over the place');
        console.log("Last book's id was: " + lastKey); // Will be 100000.
      })
      .catch(Dexie.BulkError, function (e) {
        console.error(
          'Some books did not succeed. However, ' +
            (100000 - e.failures.length) +
            ' books was added successfully'
        );
      });
  };

  async getBookRequestByIsbn(isbn: string) {
    return (await requestsDatabase.bookRequests.toArray()).find(
      (b) => b.isbn == isbn
    );
  }

  async getFirstBookRequest(): Promise<BookItem | null> {
    var count = await requestsDatabase.bookRequests.count();
    return count > 0 ? await this.listBookRequests()[0] : null;
  }

  async setBookRequestInitiated(key: number, requestInitiated: boolean) {
    return await requestsDatabase.bookRequests.update(key, {
      requestInitiated: requestInitiated,
    });
  }

  async listPendingBookRequests() {
    return await requestsDatabase.bookRequests
      .filter((b) => b.requestInitiated === false)
      .toArray();
  }

  async listBookRequests() {
    return await requestsDatabase.bookRequests.toArray();
  }

  async deleteBookRequest(key: number) {
    return await requestsDatabase.bookRequests.delete(key);
  }

  async setBookRequestCompleted(key: number) {
    return await requestsDatabase.bookRequests.update(key, {
      requestCompleted: true,
    });
  }
}

export const requestsDatabase = new AppDB();
