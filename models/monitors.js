const { pool } = require('../db.js');

async function getAllMonitors() {
    const { rows } = await pool.query(
        `SELECT id, user_id, url, name, method, headers, body, interval, status_codes FROM monitors`
    );
    return rows;
}

module.exports = { getAllMonitors };
