import express from 'express';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
const distDirectory = path.join(rootDirectory, 'dist');
const assetsDirectory = path.join(distDirectory, 'assets');
const port = Number(process.env.PORT) || 8080;

const currentEntryAssets = new Map(
  readdirSync(assetsDirectory)
    .filter(fileName => /^index-[A-Za-z0-9_-]+\.(js|css)$/.test(fileName))
    .map(fileName => [path.extname(fileName), path.join(assetsDirectory, fileName)])
);

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
app.get(/^\/assets\/index-[A-Za-z0-9_-]+\.(?:js|css)$/, (request, response, next) => {
  const currentAsset = currentEntryAssets.get(path.extname(request.path));
  if (!currentAsset) return next();

  // A phone may still have HTML from an older Cloud Run revision. Serving the
  // current entry bundle at that old hashed URL prevents a blank screen.
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.sendFile(currentAsset);
});
app.get('*', (_request, response) => {
  // The HTML points at revision-specific hashed assets. Never reuse it after a
  // deployment, otherwise a phone can request an asset from the old revision.
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.sendFile(path.join(distDirectory, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`JUMIC listening on port ${port}`);
});
