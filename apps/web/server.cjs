/**
 * cPanel / Phusion Passenger startup file for the Next.js web app.
 *
 * cPanel's "Setup Node.js App" runs a plain JavaScript file. Next has no
 * standalone JS entrypoint for Passenger, so this starts a minimal custom
 * server in production mode and listens on the PORT Passenger assigns.
 *
 * Requires a production build (`npm run build`) to exist in .next/ first.
 *
 * Configure in cPanel:
 *   Application startup file: server.cjs
 */
const { createServer } = require('node:http');
const { parse } = require('node:url');
const next = require('next');

const port = Number(process.env.PORT) || 3000;
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res, parse(req.url, true))).listen(port, () => {
    console.log(`[tuktak-web] listening on port ${port}`);
  });
});
