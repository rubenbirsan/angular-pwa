module.exports = {
  globDirectory: "dist/angular-workbox/",
  globPatterns: [
    "**/*.{css,eot,html,ico,jpg,js,json,png,svg,ttf,txt,webmanifest,woff,woff2,webm,xml}",
  ],
  swSrc: "workbox/config/service-worker.js",
  swDest: "dist/angular-workbox/service-worker.js",
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4Mb
};

