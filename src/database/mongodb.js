// Onyx Discord Bot
// Author: Onyx
import mongoose from 'mongoose';
import { logger } from '#utils';

/**
 * A MongoDB-based database provider using Mongoose.
 * Mirrors the JSONDatabase interface so repositories require minimal changes.
 * Each collection maps to a MongoDB collection via a flexible schema.
 */
export class MongoDatabase {
    constructor(uri) {
        this.uri = uri;
        this._models = new Map();
    }

    /**
     * Connects to MongoDB.
     * @returns {Promise<void>}
     */
    async connect() {
        await mongoose.connect(this.uri, {
            serverSelectionTimeoutMS: 10000,
        });
        logger.success('MongoDatabase', 'Connected to MongoDB');
    }

    /**
     * Disconnects from MongoDB.
     * @returns {Promise<void>}
     */
    async disconnect() {
        await mongoose.disconnect();
        logger.info('MongoDatabase', 'Disconnected from MongoDB');
    }

    /**
     * Returns (or creates) a Mongoose model for the given collection name.
     * @param {string} collection
     * @returns {mongoose.Model}
     */
    _getModel(collection) {
        if (this._models.has(collection)) {
            return this._models.get(collection);
        }

        const schema = new mongoose.Schema(
            {
                id: { type: String, required: true, unique: true },
                guildId: { type: String, index: true, sparse: true },
                userId: { type: String, index: true, sparse: true },
                total: { type: Number, sparse: true },
            },
            { strict: false, timestamps: true, minimize: true }
        );

        // Compound index for leaderboard-style queries (find by guild, sort by total desc)
        schema.index({ guildId: 1, total: -1 }, { sparse: true });

        const model =
            mongoose.models[collection] ||
            mongoose.model(collection, schema, collection);

        this._models.set(collection, model);
        return model;
    }

    /**
     * Strips Mongoose internal fields from a plain document object.
     * @param {Object} doc
     * @returns {Object}
     */
    _clean(doc) {
        if (!doc) return null;
        const { _id, __v, ...rest } = doc;
        return rest;
    }

    /**
     * Finds an item in a collection by its `id` field.
     * @param {string} collection
     * @param {string} id
     * @returns {Promise<Object|null>}
     */
    async get(collection, id) {
        const Model = this._getModel(collection);
        const doc = await Model.findOne({ id }).lean();
        return this._clean(doc);
    }

    /**
     * Upserts an item in a collection by its `id` field.
     * @param {string} collection
     * @param {Object} item - Must contain an `id` property.
     * @returns {Promise<void>}
     */
    async set(collection, item) {
        if (!item.id) throw new Error('Item must have an id');
        const Model = this._getModel(collection);
        await Model.findOneAndUpdate(
            { id: item.id },
            { $set: item },
            { upsert: true, returnDocument: 'after' }
        );
    }

    /**
     * Deletes an item from a collection by its `id` field.
     * @param {string} collection
     * @param {string} id
     * @returns {Promise<void>}
     */
    async delete(collection, id) {
        const Model = this._getModel(collection);
        await Model.deleteOne({ id });
    }

    /**
     * Returns all items in a collection.
     * @param {string} collection
     * @returns {Promise<Object[]>}
     */
    async all(collection) {
        const Model = this._getModel(collection);
        const docs = await Model.find({}).lean();
        return docs.map((doc) => this._clean(doc));
    }

    /**
     * Replaces the entire contents of a collection with the provided array.
     * @param {string} collection
     * @param {Object[]} data
     * @returns {Promise<void>}
     */
    async write(collection, data) {
        const Model = this._getModel(collection);
        await Model.deleteMany({});
        if (Array.isArray(data) && data.length > 0) {
            await Model.insertMany(data);
        }
    }
}

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */