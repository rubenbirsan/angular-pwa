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
  dataToDisplay: string = '';
  constructor(
    private restApiService: RestApiService,
    private restApiService1: RestApiService
  ) {
    navigator.storage.persist();

    this.initStoragePersistence().then();

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
        this.dataToDisplay = 'Data form IndexedDb: ' + res.length;
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

  async tryPersistWithoutPromtingUser() {
    console.log(navigator);
    console.log(navigator.permissions);

    if (!navigator.storage || !navigator.storage.persisted) {
      return 'never';
    }
    let persisted = await navigator.storage.persisted();
    if (persisted) {
      return 'persisted';
    }
    if (!navigator.permissions || !navigator.permissions.query) {
      return 'prompt'; // It MAY be successful to prompt. Don't know.
    }
    const permission = await navigator.permissions.query({
      name: 'persistent-storage',
    });
    if (permission.state === 'granted') {
      persisted = await navigator.storage.persist();
      if (persisted) {
        return 'persisted';
      } else {
        throw new Error('Failed to persist');
      }
    }
    if (permission.state === 'prompt') {
      return 'prompt';
    }
    return 'never';
  }

  async showEstimatedQuota() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimation = await navigator.storage.estimate();
      console.log(`Quota: ${estimation.quota}`);
      console.log(`Usage: ${estimation.usage}`);
      this.dataToDisplay =
        `Quota: ${estimation.quota / 1024 / 1024} MB` +
        `, Usage: ${estimation.usage / 1024 / 1024} MB`;
    } else {
      console.error('StorageManager not found');
    }
  }

  async initStoragePersistence() {
    const persist = await this.tryPersistWithoutPromtingUser();
    switch (persist) {
      case 'never':
        console.log('Not possible to persist storage');
        break;
      case 'persisted':
        console.log('Successfully persisted storage silently');
        break;
      case 'prompt':
        console.log('Not persisted, but we may prompt user when we want to.');
        break;
    }
  }
}
