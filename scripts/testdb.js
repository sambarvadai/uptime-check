
const { createNewMonitor, getMonitorById } = require('../db');

async function run() {
  try {
    const m = await createNewMonitor({
      userId: 1,
      url: 'https://example.com',
      interval: 60
    });
    console.log('Created monitor:', m);
    const fetched = await getMonitorById(m.id, 1);
    console.log('Fetched back:', fetched);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
