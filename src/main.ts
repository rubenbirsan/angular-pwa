import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

import { Workbox } from 'workbox-window';
import { isDevMode } from '@angular/core';

interface ServiceWorkerRegistrationLocal extends ServiceWorkerRegistration {}

loadServiceWorker();

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  // .then(() => loadServiceWorker())
  .catch((err) => console.error(err));

function loadServiceWorker() {
  if ('serviceWorker' in navigator) {
    const wb = new Workbox('/service-worker.js');
    wb.register().then((registration) => {
      console.log('Service Worker registered with scope:', registration.scope);

      // THIS EVENT IS LOGGED JUST FOR DEBUGGING PURPOSES
      // wb.addEventListener('activated', (event) => {
      //   if (!event.isUpdate) {
      //     console.log(
      //       'Service worker activated for the first time!',
      //       {
      //         event,
      //       },
      //       new Date().getMilliseconds()
      //     );
      //   } else {
      //     console.log(
      //       'Service worker activated!',
      //       { event },
      //       new Date().getMilliseconds()
      //     );
      //   }
      // });

      wb.addEventListener('installed', (event) => {
        console.log(
          'Service worker installed!',
          { event },
          new Date().getMilliseconds()
        );

        // if (event.isUpdate) {
        //   this.confirmationService.confirm({
        //     key: 'session',
        //     message: `New version is available!. Click OK to refresh.`,
        //     acceptLabel: 'OK',
        //     accept: () => {
        //       this.windowRef.getNativeWindow().location.reload();
        //     },
        //   });
        // }
      });
    });
  }

  // navigator.serviceWorker.addEventListener('message', function (event) {
  //   console.log('Received postMessage from ServiceWorker:', event.data.action);

  //   if (event.data.action === 'getLocalStorageToken') {
  //     // Read the data from 'localStorage' and respond to the service worker
  //     const key = 'token'; // Replace with your actual localStorage key
  //     const data = localStorage.getItem(key);
  //     event.source.postMessage(data);
  //   }
  // });
  // if ('serviceWorker' in navigator) {
  //   navigator.serviceWorker
  //     .register('/service-worker.js')
  //     .then((registration) => {
  //       console.log(
  //         'Service Worker registered with scope:',
  //         registration.scope
  //       );
  //     })
  //     .catch((error) => {
  //       console.error('Service Worker registration failed:', error);
  //     });
  // }
}
