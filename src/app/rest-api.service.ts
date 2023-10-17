import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Book } from './book';

@Injectable({
  providedIn: 'root',
})
export class RestApiService {
  api: string = 'https://api.angular.schule';

  constructor(private http: HttpClient) {}

  getBooks(): Observable<Book[]> {
    return this.http.get<Book[]>(this.api + '/books');
  }

  addBook(book: Book): Observable<Book> {
    return this.http.post<Book>(this.api + '/books', book);
  }

  getIndexedDbItems(): Observable<any> {
    return this.http.get<any>('/indexedDb');
  }

  getOnlineStatus(): Observable<boolean> {
    return this.http.get<boolean>('/onlineStatus');
  }
}
