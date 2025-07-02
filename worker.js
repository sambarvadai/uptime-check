import './db.js';
import {scheduleAllMonitors} from './monitorScheduler.js';
scheduleAllMonitors().catch(err => {
console.error("Error encountered while scheduling monitors:",err);
process.exit(1);
});