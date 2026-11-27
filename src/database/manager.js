// Onyx Discord Bot
// Author: Onyx
import { MongoDatabase } from './mongodb.js';
import { JsonDatabase } from './jsonDatabase.js';
import { GuildService } from '#dbServices/guilds';
import { BlacklistService } from '#dbServices/blacklist';
import { UserMessageCounterService } from '#dbServices/userMessageCounter';
import { UserInviteCounterService } from '#dbServices/userInviteCounter';
import { MemberInviterService } from '#dbServices/memberInviter';
import { logger } from '#utils';
import { config } from '#config';

/**
 * Facade that owns all database service instances and manages the connection lifecycle.
 *
 * Obtain the shared instance via the exported {@link db} constant rather than
 * constructing this class directly.
 */
export class DatabaseManager {
        constructor() {
                /** @type {GuildService|null} */
                this.guild = null;
                /** @type {BlacklistService|null} */
                this.blacklist = null;
                /** @type {UserMessageCounterService|null} */
                this.userMessageCounter = null;
                /** @type {UserInviteCounterService|null} */
                this.userInviteCounter = null;
                /** @type {MemberInviterService|null} */
                this.memberInviter = null;
                /** @type {MongoDatabase|JsonDatabase|null} */
                this.db = null;
                /** Active backend name. @type {string|null} */
                this.mode = null;
                /** Whether {@link init} has completed successfully. @type {boolean} */
                this.initialized = false;
        }

        /**
         * Connects to MongoDB (or the JSON fallback) and instantiates all service classes.
         * Idempotent — returns `this` immediately if already initialised.
         * @returns {Promise<this>}
         */
        async init() {
                if (this.initialized) return this;

                const uri = String(config.database.uri || '').trim();
                const isValidMongoUri = /^mongodb(?:\+srv)?:\/\//i.test(uri);

                try {
                        if (isValidMongoUri) {
                                this.db = new MongoDatabase(uri);
                                try {
                                        await this.db.connect();
                                        this.mode = 'mongodb';
                                } catch (mongoError) {
                                        logger.warn(
                                                'DatabaseManager',
                                                `MongoDB connection failed (${mongoError.message}); falling back to local JSON storage.`,
                                        );
                                        this.db = new JsonDatabase();
                                        await this.db.connect();
                                        this.mode = 'json';
                                }
                        } else {
                                if (uri) {
                                        logger.warn(
                                                'DatabaseManager',
                                                'MONGODB_URI is not a valid mongodb:// or mongodb+srv:// URL; using local JSON storage.',
                                        );
                                }
                                this.db = new JsonDatabase();
                                await this.db.connect();
                                this.mode = 'json';
                        }

                        this.guild = new GuildService();
                        this.blacklist = new BlacklistService();
                        this.userMessageCounter = new UserMessageCounterService();
                        this.userInviteCounter = new UserInviteCounterService();
                        this.memberInviter = new MemberInviterService();

                        this.initialized = true;
                        logger.success('DatabaseManager', `${this.mode} database initialized successfully`);
                } catch (error) {
                        logger.error('DatabaseManager', 'Failed to initialize database', error);
                        throw error;
                }

                return this;
        }

        /**
         * Disconnects from the active database and resets the initialised flag.
         * @returns {Promise<void>}
         */
        async closeAll() {
                if (this.db) {
                        await this.db.disconnect();
                }
                this.initialized = false;
                logger.info('DatabaseManager', `${this.mode || 'database'} connection closed`);
        }
}

let dbInstance = null;

/**
 * Returns the process-wide {@link DatabaseManager} singleton, creating it on first call.
 * @returns {DatabaseManager}
 */
export const getDb = () => {
        if (!dbInstance) {
                dbInstance = new DatabaseManager();
        }
        return dbInstance;
};

/** Shared {@link DatabaseManager} instance. Call `.init()` before use. */
export const db = getDb();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */