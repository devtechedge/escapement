# Security

ESCAPEMENT is a static, client-side application. It has no backend, no accounts, no runtime network calls, and no server-side data store.

## Reporting

If you find a security issue, please use GitHub's private vulnerability reporting for this repository rather than opening a public issue. Include the affected build, browser, and a short reproduction.

## Data

The bench state, saved calibres, and test history are stored in the browser in IndexedDB, with a localStorage backup. Nothing is transmitted. Exporting a calibre writes a JSON file to your device. Importing a calibre reads a local JSON file and validates every field before loading it.
