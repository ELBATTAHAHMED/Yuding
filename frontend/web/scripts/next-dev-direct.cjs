'use strict';

// Next's CLI forks a child process for `next dev`. The managed Windows
// runtime used for this project rejects that fork with EPERM, so start the
// same development server in-process and keep Fast Refresh enabled.
const { startServer } = require('next/dist/server/lib/start-server');
const path = require('path');
const fs = require('fs');

function optionValue(names) {
  for (const name of names) {
    const index = process.argv.indexOf(name);
    if (index !== -1 && process.argv[index + 1]) {
      return process.argv[index + 1];
    }
  }
  return undefined;
}

const port = Number(optionValue(['--port', '-p']) || process.env.PORT || 3000);
const hostname = optionValue(['--hostname', '-H']) || process.env.HOSTNAME;

// Always start direct dev sessions from a complete generated route manifest.
// A failed Fast Refresh cycle on Windows can otherwise leave the app shell
// serving a stale 404 even though the route source still exists.
const nextDir = path.join(process.cwd(), '.next');
try {
  fs.rmSync(nextDir, { recursive: true, force: true });
} catch (error) {
  console.warn('Unable to clear the Next.js dev cache:', error?.message || error);
}

startServer({
  dir: process.cwd(),
  port,
  isDev: true,
  allowRetry: false,
  ...(hostname ? { hostname } : {}),
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
