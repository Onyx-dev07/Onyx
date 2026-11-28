const { Sequelize } = require('sequelize');
const config = require('../config.js');

const configuredUrl = process.env.DATABASE_URL || config.DATABASE_URL || '';
const isPostgresUrl = /^postgres(?:ql)?:\/\//i.test(configuredUrl);
const DATABASE_URL = isPostgresUrl
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
        acquire: 5000,
        idle: 10000
    },
    dialectOptions: {
        connectTimeout: 5000,
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

module.exports = sequelize;

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */