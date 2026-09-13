/**
 * cPanel / Phusion Passenger startup file for the API.
 *
 * cPanel's "Setup Node.js App" runs a plain JavaScript file, not TypeScript.
 * This shim registers the `tsx` loader (a runtime dependency) and then boots
 * the real TypeScript entrypoint, so no separate build step is needed.
 *
 * Configure in cPanel:
 *   Application startup file: server.cjs
 *
 * Passenger provides PORT via the environment; src/index.ts reads it.
 */
require('tsx/cjs');
require('./src/index.ts');
