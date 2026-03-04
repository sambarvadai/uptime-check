const axios = require('axios');
const { getAllMonitors } = require('./models/monitors.js');
const { pool } = require('./db.js');

const CHECK_TIMEOUT_MS = 10000; // 10 second timeout regardless of check interval

// Track active intervals so we can clear them when a monitor is deleted/updated
const activeIntervals = new Map(); // monitorId -> intervalId

async function checkRecord({ monitorId, upStatus, statusCode, responseTime, error }) {
    await pool.query(
        `INSERT INTO monitor_checks(monitor_id, up_status, status_code, response_time, error)
        VALUES($1, $2, $3, $4, $5)`,
        [monitorId, upStatus, statusCode, responseTime, error?.toString() ?? null]
    );
}

async function doCheck(monitor) {
    const startTime = Date.now();
    let upStatus = false, statusCode = null, error = null;
    try {
        const response = await axios({
            method: monitor.method || 'GET',
            url: monitor.url,
            timeout: CHECK_TIMEOUT_MS,
            headers: monitor.headers || {},
            data: monitor.body || undefined,
            // Don't throw on non-2xx so we can record the actual status code
            validateStatus: () => true,
        });
        statusCode = response.status;
        upStatus = Array.isArray(monitor.status_codes)
            ? monitor.status_codes.includes(statusCode)
            : false;
    } catch (err) {
        error = err;
    }
    const duration = Date.now() - startTime;
    await checkRecord({
        monitorId: monitor.id,
        upStatus,
        statusCode,
        responseTime: duration,
        error,
    });
    if (!upStatus) {
        console.warn(
            `Monitor ${monitor.id} (${monitor.name || monitor.url}) is DOWN. ` +
            `Status: ${statusCode ?? 'none'}, Error: ${error?.message ?? 'none'}`
        );
    }
}

function scheduleMonitor(monitor) {
    // Clear any previous interval for this monitor (handles reschedule after update)
    if (activeIntervals.has(monitor.id)) {
        clearInterval(activeIntervals.get(monitor.id));
    }
    doCheck(monitor).catch(console.error);
    const intervalId = setInterval(
        () => doCheck(monitor).catch(console.error),
        monitor.interval * 1000
    );
    activeIntervals.set(monitor.id, intervalId);
    console.log(`Monitor ${monitor.id} (${monitor.name || monitor.url}) scheduled every ${monitor.interval}s.`);
}

function unscheduleMonitor(monitorId) {
    if (activeIntervals.has(monitorId)) {
        clearInterval(activeIntervals.get(monitorId));
        activeIntervals.delete(monitorId);
        console.log(`Monitor ${monitorId} unscheduled.`);
    }
}

async function scheduleAllMonitors() {
    const monitors = await getAllMonitors();
    monitors.forEach(scheduleMonitor);
    console.log(`Scheduled ${monitors.length} monitors.`);
}

module.exports = { scheduleMonitor, unscheduleMonitor, scheduleAllMonitors };
