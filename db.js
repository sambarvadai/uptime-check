require('dotenv').config();
console.log('CONNECTING TO:', process.env.DATABASE_URL);
const {Pool} = require('pg');
const bcrypt = require('bcrypt');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
async function createNewMonitor({userId,url,interval,name,statusCodes}){
const {rows} = await pool.query(
`INSERT INTO monitors (user_id,url,interval,name,status_codes)
VALUES ($1, $2, $3, $4, $5)
RETURNING *`,
[
    userId,
    url,
    interval,
    name || null,
    Array.isArray(statusCodes)&&statusCodes.length ? statusCodes: [200],
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
        `SELECT * from monitors where user_id = $1
        ORDER BY created_at DESC`,
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
        name:'name',
        interval: 'interval',
        statusCodes:'status_codes',
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
        `INSERT INTO users ( username,hashedPwd)
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
    createNewMonitor,
    getMonitorById,
    getAllMonitors,
    updateMonitorById,
    deleteMonitorById, // Exporting pool if needed elsewhere
    createUser,
    getUserByUsername,
};