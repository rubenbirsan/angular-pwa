import { Component, EventEmitter, Output } from '@angular/core';
import { RestApiService } from '../rest-api.service';
import { Book } from '../book';
import { MAT_DATE_FORMATS } from '@angular/material/core';

@Component({
  selector: 'app-book-form',
  templateUrl: './book-form.component.html',
  styleUrls: ['./book-form.component.css'],
  providers: [
    // Provide custom date format here (optional)
    {
      provide: MAT_DATE_FORMATS,
      useValue: {
        parse: { dateInput: 'LL' },
        display: {
          dateInput: 'LL',
          monthYearLabel: 'MMM YYYY',
          dateA11yLabel: 'LL',
          monthYearA11yLabel: 'MMMM YYYY',
        },
      },
    },
  ],
})
export class BookFormComponent {
  book: Book = {
    isbn: '9783864905521',
    title: 'React1',
    published: new Date(),
    price: 22,
    addedOffline: true,
    rating: 2,
  };

  @Output() addBookEvent = new EventEmitter();

  constructor(private restApiService: RestApiService) {
    this.newForm();
  }

  onSubmit() {
    console.log('AddBook button clicked');
    this.addBookEvent.emit();
    this.restApiService.addBook(this.book).subscribe((book) => {});
    this.newForm();
  }

  generateRandomIsbn(length: number): string {
    const characters = '123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }

    return result;
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

  getRandomNumber(min: number, max: number): number {
    // Generate a random number between min (inclusive) and max (exclusive)
    return Math.floor(Math.random() * (max - min) + min);
  }

  newForm() {
    this.book.isbn = this.generateRandomIsbn(13);
    this.book.title = this.generateRandomName(8);
    this.book.rating = this.getRandomNumber(1, 5);
    this.book.price = this.getRandomNumber(1, 60);
  }
}
