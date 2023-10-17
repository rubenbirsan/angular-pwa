import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './material.module';
import { HttpClientModule } from '@angular/common/http';
import { BookFormComponent } from './book-form/book-form.component';

export function initializeApp() {
  return () => navigator.serviceWorker?.ready;
}
@NgModule({
  declarations: [AppComponent, BookFormComponent],

  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MaterialModule,
    HttpClientModule,
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
