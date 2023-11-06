import { Component, OnInit, ViewChild } from '@angular/core';
import { RestApiService } from './rest-api.service';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { liveQuery } from 'dexie';
import { requestsDatabase } from '../../workbox/db/db';

export interface TableElement {
  isbn: string;
  title: string;
  published: Date;
  price: number;
  addedOffline: boolean;
  rating: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  Data!: TableElement[];
  col: string[] = ['isbn', 'title', 'published', 'price', 'rating'];
  dataSource = new MatTableDataSource<TableElement>(this.Data);
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;

  isOnline: boolean = false;
  constructor(
    private restApiService: RestApiService,
    private restApiService1: RestApiService
  ) {
    localStorage.setItem('token', this.generateRandomName(20));
    localStorage.setItem('isOnline', 'false');
    localStorage.setItem('loadBooks', 'false');

    const data = localStorage.getItem('token');

    setTimeout(() => {
      this.loadBooks();

      navigator.serviceWorker.controller.postMessage({
        data: data,
        action: 'setAccessToken',
      });
    }, 500);

    setInterval(() => {
      this.isOnline = localStorage.getItem('isOnline') === 'true';

      var reloadBooks = localStorage.getItem('loadBooks');

      if (reloadBooks === 'true') {
        localStorage.setItem('loadBooks', 'false');
        this.loadBooks();
      }
    }, 1000);

    navigator.serviceWorker.addEventListener('message', function (event) {
      if (event.data.action === 'offline') {
        localStorage.setItem('isOnline', 'false');
      }
      if (event.data.action === 'online') {
        localStorage.setItem('isOnline', 'true');
      }
      if (event.data.action === 'loadBooks') {
        localStorage.setItem('loadBooks', 'true');
      }
    });
  }

  generateRandomName(length: number): string {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }

    return result;
  }

  getStyle(addedOffline: boolean) {
    return {
      'background-color': addedOffline ? 'lightpink' : '',
    };
  }

  getIndexedDbItems() {
    setTimeout(() => {
      this.restApiService.getIndexedDbItems().subscribe((res) => {
        console.log('Data form IndexedDb: ', res);
      });
    }, 10);
  }

  loadBooks() {
    this.restApiService.getBooks().subscribe((res) => {
      res.sort(
        (a, b) =>
          new Date(a.published).getTime() - new Date(b.published).getTime()
      );

      this.dataSource = new MatTableDataSource<TableElement>(res.slice(7));
      setTimeout(() => {
        this.dataSource.paginator = this.paginator;
      }, 0);
    });
  }

  addBookEventHandler() {
    setTimeout(() => {
      this.loadBooks();
    }, 500);
  }
}
