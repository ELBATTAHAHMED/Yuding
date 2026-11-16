'use strict';

// Next's CLI forks a child process for `next dev`. The managed Windows
// runtime used for this project rejects that fork with EPERM, so start the
// same development server in-process and keep Fast Refresh enabled.
const { startServer } = require('next/dist/server/lib/start-server');

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
