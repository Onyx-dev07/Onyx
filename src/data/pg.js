const { Pool } = require('pg');
const dbStatus = require('./dbStatus');

const configuredUrl = dbStatus.configuredUrl();
const hasDatabase = dbStatus.hasConfiguredDatabase();
const connectionString = hasDatabase
    ? configuredUrl
    : 'postgres://postgres:postgres@127.0.0.1:5432/onyx';

const realPool = hasDatabase
    ? new Pool({
        connectionString,
        ssl: / Neon\.tech|supabase|sslmode=require/i.test(connectionString)
            ? { require: true, rejectUnauthorized: false }
            : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
    })
    : null;

const emptyResult = () => ({ rows: [], rowCount: 0 });

const query = async (text, params) => {
    if (!dbStatus.isDatabaseAvailable() || !realPool) return emptyResult();
    try {
        return await realPool.query(text, params);
    } catch (error) {
        dbStatus.disableDatabase(error, 'PostgreSQL');
        return emptyResult();
    }
};

const getOne = async (text, params) => {
    const res = await query(text, params);
    return res.rows[0] || null;
};

const getAll = async (text, params) => {
    const res = await query(text, params);
    return res.rows;
};

const run = async (text, params) => {
    const res = await query(text, params);
    return { changes: res.rowCount };
};

const pool = {
    query,
    on(event, handler) {
        if (realPool) realPool.on(event, handler);
        return pool;
    },
    async end() {
        if (realPool) await realPool.end().catch(() => {});
    },
    get totalCount() { return realPool ? realPool.totalCount : 0; },
    get idleCount() { return realPool ? realPool.idleCount : 0; },
    get waitingCount() { return realPool ? realPool.waitingCount : 0; },
};

pool.on('error', (err) => {
    dbStatus.disableDatabase(err, 'PostgreSQL idle client');
});

module.exports = { pool, query, getOne, getAll, run };

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */
