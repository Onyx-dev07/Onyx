const { Pool } = require('pg');
const config = require('../config.js');

const configuredUrl = process.env.DATABASE_URL || config.DATABASE_URL || '';
const isPostgresUrl = /^postgres(?:ql)?:\/\//i.test(configuredUrl);
const connectionString = isPostgresUrl
    ? configuredUrl
    : 'postgres://postgres:postgres@127.0.0.1:5432/onyx';

const pool = new Pool({
    connectionString,
    ssl: isPostgresUrl && / Neon\.tech|supabase|sslmode=require/i.test(connectionString)
        ? { require: true, rejectUnauthorized: false }
        : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
    console.error('[PostgreSQL] Unexpected error on idle client:', err.message);
});

const query = async (text, params) => {
    const res = await pool.query(text, params);
    return res;
};

const getOne = async (text, params) => {
    const res = await pool.query(text, params);
    return res.rows[0] || null;
};

const getAll = async (text, params) => {
    const res = await pool.query(text, params);
    return res.rows;
};

const run = async (text, params) => {
    const res = await pool.query(text, params);
    return { changes: res.rowCount };
};

module.exports = { pool, query, getOne, getAll, run };

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */