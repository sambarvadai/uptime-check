 import {pool} from '../db.js';
 export async function getAllMonitors(){
    const {rows} = await pool.query(
        `SELECT id,user_id,url,interval,name,status_codes FROM monitors`);
    return rows;
 }