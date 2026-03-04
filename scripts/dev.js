const { spawnSync, spawn } = require('child_process');

function runSync(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main() {
  const skipInstall =
    process.env.SKIP_INSTALL === '1' || process.env.SKIP_INSTALL === 'true';

  if (!skipInstall) {
    console.log('Installing npm dependencies...');
    runSync('npm', ['install']);
  } else {
    console.log('Skipping npm install because SKIP_INSTALL is set.');
  }

  console.log('Running database setup...');
  runSync('node', ['scripts/setupdb.js']);

  console.log('Starting backend (node index.js)...');
  const backend = spawn('node', ['index.js'], {
    stdio: 'inherit',
    shell: true,
  });

  console.log('Starting frontend (npm start)...');
  const frontend = spawn('npm', ['start'], {
    stdio: 'inherit',
    shell: true,
  });

  const shutdown = () => {
    console.log('\nShutting down dev environment...');
    if (!backend.killed) backend.kill('SIGINT');
    if (!frontend.killed) frontend.kill('SIGINT');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

