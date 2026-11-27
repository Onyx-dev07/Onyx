// Onyx Discord Bot
// Author: Onyx
import { MongoDatabase } from './mongodb.js';
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
                /** @type {MongoDatabase|null} */
                this.db = null;
                /** Whether {@link init} has completed successfully. @type {boolean} */
                this.initialized = false;
        }

        /**
         * Connects to MongoDB and instantiates all service classes.
         * Idempotent — returns `this` immediately if already initialised.
         * @returns {Promise<this>}
         */
        async init() {
                if (this.initialized) return this;

                try {
                        this.db = new MongoDatabase(config.database.uri);
                        await this.db.connect();

                        this.guild = new GuildService();
                        this.blacklist = new BlacklistService();
                        this.userMessageCounter = new UserMessageCounterService();
                        this.userInviteCounter = new UserInviteCounterService();
                        this.memberInviter = new MemberInviterService();

                        this.initialized = true;
                        logger.success('DatabaseManager', 'MongoDB initialized successfully');
                } catch (error) {
                        logger.error('DatabaseManager', 'Failed to initialize MongoDB', error);
                        throw error;
                }

                return this;
        }

        /**
         * Disconnects from MongoDB and resets the initialised flag.
         * @returns {Promise<void>}
         */
        async closeAll() {
                if (this.db) {
                        await this.db.disconnect();
                }
                this.initialized = false;
                logger.info('DatabaseManager', 'MongoDB connection closed');
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