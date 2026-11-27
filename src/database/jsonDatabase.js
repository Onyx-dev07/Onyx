// Onyx Discord Bot
// Author: Onyx

import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * Lightweight JSON-file database used when MongoDB is not configured.
 * Exposes the same small collection API as {@link MongoDatabase} so the
 * repository layer does not need to know which backend is active.
 */
export class JsonDatabase {
        constructor(filePath = process.env.ONYX_DB_FILE) {
                this.filePath =
                        filePath || path.join(process.cwd(), 'data', 'onyx-db.json');
                this.collections = new Map();
                this._writeQueue = Promise.resolve();
        }

        async connect() {
                await fs.mkdir(path.dirname(this.filePath), { recursive: true });

                try {
                        const raw = await fs.readFile(this.filePath, 'utf8');
                        const parsed = JSON.parse(raw);
                        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                                for (const [name, items] of Object.entries(parsed)) {
                                        if (Array.isArray(items)) {
                                                this.collections.set(name, items);
                                        }
                                }
                        }
                } catch (error) {
                        if (error.code !== 'ENOENT') {
                                logger.warn(
                                        'JsonDatabase',
                                        `Could not read ${this.filePath}; starting empty: ${error.message}`,
                                );
                        }
                }

                logger.warn(
                        'JsonDatabase',
                        `MongoDB not configured; using local JSON storage at ${this.filePath}`,
                );
        }

        async disconnect() {
                await this._persist();
                logger.info('JsonDatabase', 'JSON database closed');
        }

        _collection(name) {
                if (!this.collections.has(name)) {
                        this.collections.set(name, []);
                }
                return this.collections.get(name);
        }

        _clean(doc) {
                if (!doc) return null;
                const { _id, __v, ...rest } = doc;
                return rest;
        }

        async _persist() {
                this._writeQueue = this._writeQueue.then(async () => {
                        const snapshot = Object.fromEntries(this.collections);
                        const tempPath = `${this.filePath}.tmp`;
                        await fs.writeFile(
                                tempPath,
                                JSON.stringify(snapshot, null, 2),
                                'utf8',
                        );
                        await fs.rename(tempPath, this.filePath);
                });

                return this._writeQueue.catch((error) => {
                        logger.error('JsonDatabase', 'Failed to persist database:', error);
                });
        }

        async get(collection, id) {
                const item = this._collection(collection).find((entry) => entry.id === id);
                return this._clean(item ? { ...item } : null);
        }

        async set(collection, item) {
                if (!item?.id) throw new Error('Item must have an id');

                const items = this._collection(collection);
                const cleaned = this._clean({ ...item });
                const index = items.findIndex((entry) => entry.id === cleaned.id);

                if (index >= 0) {
                        items[index] = cleaned;
                } else {
                        items.push(cleaned);
                }

                await this._persist();
        }

        async delete(collection, id) {
                const items = this._collection(collection);
                this.collections.set(
                        collection,
                        items.filter((entry) => entry.id !== id),
                );
                await this._persist();
        }

        async all(collection) {
                return this._collection(collection).map((item) => this._clean({ ...item }));
        }

        async write(collection, data) {
                this.collections.set(
                        collection,
                        (Array.isArray(data) ? data : []).map((item) => this._clean({ ...item })),
                );
                await this._persist();
        }

        async query(collection, filter = {}, sort = {}) {
                let items = this._collection(collection).filter((item) =>
                        Object.entries(filter).every(([key, value]) => item[key] === value),
                );

                const sortEntries = Object.entries(sort);
                if (sortEntries.length > 0) {
                        items = [...items].sort((a, b) => {
                                for (const [key, direction] of sortEntries) {
                                        const av = a[key] ?? 0;
                                        const bv = b[key] ?? 0;
                                        if (av === bv) continue;
                                        return (av > bv ? 1 : -1) * direction;
                                }
                                return 0;
                        });
                }

                return items.map((item) => this._clean({ ...item }));
        }
}
