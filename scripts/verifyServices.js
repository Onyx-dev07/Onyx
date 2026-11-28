// Onyx Discord Bot
// Author: Onyx

const dbStatus = require('../src/data/dbStatus');
const { query, pool } = require('../src/data/pg');
const sequelize = require('../src/data/sequelize');
const models = require('../src/data/models');
const { GuildPrefix } = models;

const TABLE = 'onyx_service_check';

async function verifyPooledPostgres() {
    const ping = await query('SELECT 1 AS ok');
    if (ping.rows[0]?.ok !== 1) throw new Error('Pooled Postgres ping did not return 1');

    const token = `onyx-verify-${Date.now()}`;
    await query(`CREATE TABLE IF NOT EXISTS ${TABLE} (value TEXT NOT NULL)`);
    await query(`INSERT INTO ${TABLE} (value) VALUES ($1)`, [token]);
    const rows = await query(`SELECT value FROM ${TABLE} WHERE value = $1`, [token]);
    await query(`DELETE FROM ${TABLE} WHERE value = $1`, [token]);
    await query(`DROP TABLE IF EXISTS ${TABLE}`);

    if (rows.rows[0]?.value !== token) throw new Error('Pooled Postgres round-trip failed');
    return true;
}

async function verifySequelize() {
    const rows = await sequelize.query('SELECT 1 AS ok', { type: 'SELECT' });
    if (rows[0]?.ok !== 1) throw new Error('Sequelize ping did not return 1');
    return true;
}

async function verifyPrefixPersistence() {
    const guildId = `neon-verify-${Date.now()}`;
    await GuildPrefix.setPrefix(guildId, '!');
    const prefix = await GuildPrefix.getPrefix(guildId);
    await GuildPrefix.deletePrefix(guildId);
    const cleared = await GuildPrefix.getPrefix(guildId);

    if (prefix !== '!') throw new Error('GuildPrefix write/read failed');
    if (cleared !== null) throw new Error('GuildPrefix reset failed');
    return true;
}

(async () => {
    if (!dbStatus.isDatabaseAvailable()) {
        throw new Error('DATABASE_URL is not configured or the database is disabled');
    }

    const synced = await models.dbReady;
    if (!synced) throw new Error('Database schema sync did not complete');

    const results = {
        pooledPostgres: await verifyPooledPostgres(),
        sequelize: await verifySequelize(),
        prefixPersistence: await verifyPrefixPersistence(),
    };

    console.log('[Onyx] Neon service checks passed:', JSON.stringify(results));
})().catch((error) => {
    console.error('[Onyx] Neon service check failed:', error.message);
    process.exitCode = 1;
}).finally(async () => {
    await pool.end().catch(() => {});
});
