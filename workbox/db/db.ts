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
    for (let i = 0; i < 100000; i++) {
      await requestsDatabase.bookRequests.add({
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
