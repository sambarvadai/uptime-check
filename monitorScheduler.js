import axios from 'axios';
import {getAllMonitors} from './models/monitors.js';
import {pool} from './db.js';
async function checkRecord({monitorId, upStatus, statusCode,responseTime,error}){
    await pool.query(
        `INSERT INTO monitor_checks(monitor_id, up_status, status_code, response_time, error)
        VALUES( $1, $2, $3, $4, $5)`,
        [monitorId, upStatus, statusCode, responseTime, error?.toString() ?? null]
    );
}
async function doCheck(monitor){
    const startTime = Date.now();
    let upStatus = false,statusCode = null, error = null;
    try{
        const response = await axios.get(monitor.url,{ timeout: monitor.interval * 1000});
        statusCode = response.status;
        upStatus = monitor.status_codes.includes(statusCode);
    }catch(err){
        error = err;
    }
    const duration = Date.now() - startTime;
    await checkRecord({
        monitorId: monitor.id,
        upStatus,
        statusCode,
        responseTime: duration,
        error
    });
    if(!upStatus){
        console.warn(`Monitor ${monitor.id} (${monitor.name}) is down! URL: ${monitor.url}, Status Code: ${statusCode}, Error: ${error?.message}`);
    }
} 
export async function scheduleMonitor(monitor){
doCheck(monitor).catch(console.error);
setInterval(()=>{
    doCheck(monitor).catch(console.error)}, monitor.interval * 1000);
console.log(`Monitor ${monitor.id} scheduled at every ${monitor.interval} seconds.`);
}  
export async function scheduleAllMonitors(){
    const monitors = await getAllMonitors();
    monitors.forEach(scheduleMonitor);
    console.log(`Scheduled ${monitors.length} monitors.`);
}