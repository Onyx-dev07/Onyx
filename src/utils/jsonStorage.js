// jsonStorage.js
// Persistent JSON-file storage implementing the same interface as MemoryStorage.
// Replaces PostgreSQL for the Onyx merge: every key/value write is kept in memory
// and flushed atomically to data/database.json.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');
const dbFile = path.join(dataDir, 'database.json');
const SAVE_DEBOUNCE_MS = 400;

class JsonStorage {
    constructor() {
        this.data = new Map();
        this.expirationTimes = new Map();
        this.loaded = false;
        this.saveTimer = null;
        this.lastSaveError = null;
    }

    load() {
        if (this.loaded) {
            return;
        }

        try {
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            if (fs.existsSync(dbFile)) {
                const raw = fs.readFileSync(dbFile, 'utf8');
                const parsed = raw ? JSON.parse(raw) : {};
                const entries = parsed?.data && typeof parsed.data === 'object'
                    ? parsed.data
                    : parsed;

                for (const [key, value] of Object.entries(entries || {})) {
                    this.data.set(key, value);
                }

                logger.info(`Loaded ${this.data.size} database entries from ${dbFile}`);
            } else {
                this.flush();
                logger.info(`Created new database file at ${dbFile}`);
            }
        } catch (error) {
            this.lastSaveError = error;
            logger.error('Failed to load JSON database, starting empty:', error);
        }

        this.loaded = true;
    }

    scheduleSave() {
        if (this.saveTimer) {
            return;
        }

        this.saveTimer = setTimeout(() => {
            this.saveTimer = null;
            this.flush();
        }, SAVE_DEBOUNCE_MS);

        // Do not keep the process alive just for a pending write.
        if (typeof this.saveTimer.unref === 'function') {
            this.saveTimer.unref();
        }
    }

    flush() {
        if (!this.loaded && this.data.size === 0) {
            return true;
        }

        try {
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            const payload = JSON.stringify({
                version: 1,
                savedAt: new Date().toISOString(),
                data: Object.fromEntries(this.data),
            }, null, 2);

            const tempFile = `${dbFile}.tmp`;
            fs.writeFileSync(tempFile, payload, 'utf8');
            fs.renameSync(tempFile, dbFile);
            this.lastSaveError = null;
            return true;
        } catch (error) {
            this.lastSaveError = error;
            logger.error('Failed to persist JSON database:', error);
            return false;
        }
    }

    isExpired(key) {
        if (!this.expirationTimes.has(key)) {
            return false;
        }

        if (Date.now() > this.expirationTimes.get(key)) {
            this.data.delete(key);
            this.expirationTimes.delete(key);
            return true;
        }

        return false;
    }

    async get(key, defaultValue = null) {
        this.isExpired(key);
        const value = this.data.get(key);
        return value !== undefined ? value : defaultValue;
    }

    async set(key, value, ttl = null) {
        this.data.set(key, value);

        if (ttl && ttl > 0) {
            this.expirationTimes.set(key, Date.now() + (ttl * 1000));
        } else {
            this.expirationTimes.delete(key);
        }

        this.scheduleSave();
        return true;
    }

    async delete(key) {
        const existed = this.data.delete(key);
        this.expirationTimes.delete(key);

        if (existed) {
            this.scheduleSave();
        }

        return true;
    }

    async list(prefix) {
        const keys = [];

        for (const key of this.data.keys()) {
            if (this.isExpired(key)) {
                continue;
            }

            if (key.startsWith(prefix)) {
                keys.push(key);
            }
        }

        return keys;
    }

    async exists(key) {
        this.isExpired(key);
        return this.data.has(key);
    }

    async increment(key, amount = 1) {
        const current = Number(await this.get(key, 0)) || 0;
        const newValue = current + amount;
        await this.set(key, newValue);
        return newValue;
    }

    async decrement(key, amount = 1) {
        const current = Number(await this.get(key, 0)) || 0;
        const newValue = current - amount;
        await this.set(key, newValue);
        return newValue;
    }

    async clear() {
        this.data.clear();
        this.expirationTimes.clear();
        this.scheduleSave();
        return true;
    }

    getFilePath() {
        return dbFile;
    }

    getStatus() {
        return {
            file: dbFile,
            entries: this.data.size,
            lastSaveError: this.lastSaveError ? String(this.lastSaveError.message || this.lastSaveError) : null,
        };
    }
}

export { JsonStorage, dbFile };
export default JsonStorage;
