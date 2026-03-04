require('./db.js');
const scheduler = require('./monitorScheduler.js');

scheduler.scheduleAllMonitors().catch(err => {
    console.error("Error encountered while scheduling monitors:", err);
    process.exit(1);
});

module.exports = scheduler;
