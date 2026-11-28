const { Sequelize } = require('sequelize');
const dbStatus = require('./dbStatus');

const configuredUrl = dbStatus.configuredUrl();
const hasDatabase = dbStatus.hasConfiguredDatabase();
const DATABASE_URL = hasDatabase
    ? configuredUrl
    : 'postgres://postgres:postgres@127.0.0.1:5432/onyx';

const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    define: {
        timestamps: true,
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 15000,
        idle: 10000
    },
    dialectOptions: {
        connectTimeout: 15000,
        ssl: dbStatus.sslOptions(DATABASE_URL),
    },
    retry: {
        max: 1,
        match: [
            /SequelizeConnectionError/,
            /SequelizeConnectionRefusedError/,
            /SequelizeHostNotFoundError/,
            /SequelizeHostNotReachableError/,
            /SequelizeInvalidConnectionError/,
            /SequelizeConnectionTimedOutError/,
            /ECONNRESET/,
            /ECONNREFUSED/,
        ],
    }
});

const originalQuery = sequelize.query.bind(sequelize);

sequelize.query = async function safeQuery(sql, options = {}) {
    if (!dbStatus.isDatabaseAvailable()) {
        if (options.type === 'COUNT' || /\bcount\s*\(/i.test(sql)) return [{ count: 0 }];
        return [];
    }

    try {
        return await originalQuery(sql, options);
    } catch (error) {
        if (dbStatus.isConnectionError(error)) {
            dbStatus.disableDatabase(error, 'Sequelize');
            return [];
        }
        throw error;
    }
};

module.exports = sequelize;

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */
