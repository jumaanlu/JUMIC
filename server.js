import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
const distDirectory = path.join(rootDirectory, 'dist');
const port = Number(process.env.PORT) || 8080;

app.disable('x-powered-by');
app.use(express.static(distDirectory, {
  setHeaders(response, filePath) {
    if (filePath.endsWith('.html')) {
      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return;
    }

    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));
app.get('*', (_request, response) => {
  // The HTML points at revision-specific hashed assets. Never reuse it after a
  // deployment, otherwise a phone can request an asset from the old revision.
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.sendFile(path.join(distDirectory, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`JUMIC listening on port ${port}`);
});
