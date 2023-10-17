const { injectManifest } = require("workbox-build");

// We reuse the configuration from Workbox CLI
var workboxConfig = require("./workbox-config.js");

// Deleting unneeded property
// delete workboxConfig.runtimeCaching;

injectManifest(workboxConfig).then(({ count, size }) => {
  console.log(`Configuration: ${workboxConfig}`);
  console.log(
    `Generated ${workboxConfig.swDest}, which will precache ${count} files, totaling ${size} bytes.`
  );
});
