require('dotenv').config();
const {Pool} = require('pg');
const bcrypt = require('bcrypt');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
async function createNewMonitor({userId, url, interval, name, statusCodes, method, headers, body}){
    const {rows} = await pool.query(
        `INSERT INTO monitors (user_id, url, interval, name, status_codes, method, headers, body)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
            userId,
            url,
            interval,
            name || null,
            Array.isArray(statusCodes) && statusCodes.length ? statusCodes : [200],
            method || 'GET',
            headers || {},
            body || null,
        ]
    );
    return rows[0];
}
async function getMonitorById(id,userId){
    const {rows} = await pool.query(
        `SELECT * from monitors where ID = $1 AND user_id = $2`,
        [id,userId]
    );
    return rows[0] || null;
}
async function getAllMonitors(userid){
    const {rows} = await pool.query(
        `SELECT
            m.*,
            mc.checked_at AS last_ping_at,
            mc.up_status AS last_up,
            mc.status_code AS last_status_code,
            mc.response_time AS last_response_time,
            mc.error AS last_error
        FROM monitors m
        LEFT JOIN LATERAL (
            SELECT *
            FROM monitor_checks
            WHERE monitor_id = m.id
            ORDER BY checked_at DESC
            LIMIT 1
        ) mc ON TRUE
        WHERE m.user_id = $1
        ORDER BY m.created_at DESC`,
        [userid]
    );
    return rows;
}
async function updateMonitorById(id,userid, updates){
    const setClauses = [];
    const values = [];
    let idx = 1;
    const colMap = {
        url: 'url',
        name: 'name',
        interval: 'interval',
        statusCodes: 'status_codes',
        method: 'method',
        headers: 'headers',
        body: 'body',
    };
    for(let key of Object.keys(updates)){
        if(colMap[key]){
            setClauses.push(`${colMap[key]} = $${idx++}`);
            values.push(updates[key]);
        }
    }
    if(setClauses.length === 0){
        return null; //There is nothing to update in this case
    }
    values.push(id, userid);
    const myquery = 
        `UPDATE monitors SET ${setClauses.join(', ')}
        where id = $${idx} AND user_id = $${idx + 1}
        RETURNING *`
    ;
    const {rows} = await pool.query(myquery,values);
    return rows[0]||null;
}
async function deleteMonitorById(id,userId){
    const {rowCount} = await pool.query(
        `DELETE FROM monitors where id = $1 AND user_id = $2
        RETURNING *`,[id, userId]
    );
    return rowCount > 0;
}
async function createUser({username,password}){
    const hashedPwd = await bcrypt.hash(password, 10);
    const {rows} = await pool.query(
        `INSERT INTO users ( username,password_hash)
        VALUES ($1, $2)
        RETURNING id,username,created_at`,
        [username,hashedPwd]
    );
    return rows[0];
}
async function getUserByUsername(username){
const {rows} = await pool.query(
    `SELECT * from users where username = $1`,
    [username]
);
return rows[0] || null;
}
module.exports = {
    pool,
    createNewMonitor,
    getMonitorById,
    getAllMonitors,
    updateMonitorById,
    deleteMonitorById, // Exporting pool if needed elsewhere
    createUser,
    getUserByUsername,
};
