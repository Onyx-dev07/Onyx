// Onyx Discord Bot
// Author: Onyx
import { ReiT } from '#classes/rei';
import { logger } from '#utils';

/**
 * In-memory cache manager via {@link Rei}.
 */
export class CacheManager {
	/**
	 * @param {Object} config
	 * @param {number} [config.maxSize=50000] - Max entries for the in-memory store.
	 * @param {boolean} [config.flushOnStart] - Clear cache on bot startup.
	 * @param {boolean} [config.flushOnShutdown] - Clear cache on bot shutdown.
	 */
	constructor(config) {
		this.config = config;
		this.memory = new ReiT(config.maxSize || 50000);
	}

	/**
	 * Initializes the cache manager.
	 * @returns {Promise<this>}
	 */
	async init() {
		logger.info('Cache', 'Cache manager initialized with memory storage');
		return this;
	}

	/**
	 * Stores a key-value pair with an optional TTL.
	 * @param {string} k
	 * @param {*} v
	 * @param {number} [ttl] - Expiry in seconds.
	 * @returns {Promise<boolean>}
	 */
	async set(k, v, ttl) {
		this.memory.set(k, v, ttl);
		return true;
	}

	/**
	 * Atomically sets a key only when it does not already exist.
	 * @param {string} k
	 * @param {*} v
	 * @param {number} ttl - Expiry in seconds.
	 * @returns {Promise<boolean>} `true` if the key was set, `false` if it already existed.
	 */
	async setnxex(k, v, ttl) {
		if (this.memory.has(k)) return false;
		this.memory.set(k, v, ttl);
		return true;
	}

	/**
	 * @param {string} k @returns {Promise<*>} `null` if not found.
	 */
	async get(k) {
		return this.memory.get(k);
	}

	/**
	 * @param {string} k @returns {Promise<boolean>}
	 */
	async has(k) {
		return this.memory.has(k);
	}

	/**
	 * @param {string} k @returns {Promise<boolean>}
	 */
	async del(k) {
		this.memory.del(k);
		return true;
	}

	/**
	 * @param {Array<[string, *]>} arr @returns {Promise<boolean>}
	 */
	async mset(arr) {
		this.memory.mset(arr);
		return true;
	}

	/**
	 * @param {string[]} keys @returns {Promise<Array<*>>}
	 */
	async mget(keys) {
		return this.memory.mget(keys);
	}

	/**
	 * @param {string[]} keys @returns {Promise<boolean>}
	 */
	async mdel(keys) {
		this.memory.mdel(keys);
		return true;
	}

	/**
	 * @param {string} k @param {number} [d=1] @returns {Promise<number>}
	 */
	async incr(k, d = 1) {
		return this.memory.incr(k, d);
	}

	/**
	 * @param {string} k @param {number} [d=1] @returns {Promise<number>}
	 */
	async decr(k, d = 1) {
		return this.memory.decr(k, d);
	}

	/**
	 * @param {string} [pattern='*'] @returns {Promise<string[]>}
	 */
	async keys(pattern = '*') {
		return this.memory.keys(pattern);
	}

	async hset(k, f, v) {
		this.memory.hset(k, f, v);
		return true;
	}

	async hget(k, f) {
		return this.memory.hget(k, f);
	}

	async hdel(k, f) {
		this.memory.hdel(k, f);
		return true;
	}

	async hgetall(k) {
		return this.memory.hgetall(k);
	}

	async hmset(k, obj) {
		this.memory.hmset(k, obj);
		return true;
	}

	async hincrby(k, f, d = 1) {
		return this.memory.hincrby(k, f, d);
	}

	async sadd(k, ...members) {
		this.memory.sadd(k, ...members);
		return true;
	}

	async smembers(k) {
		return this.memory.smembers(k);
	}

	async sismember(k, m) {
		return this.memory.sismember(k, m);
	}

	async srem(k, ...members) {
		this.memory.srem(k, ...members);
		return true;
	}

	async lpush(k, ...values) {
		return this.memory.lpush(k, ...values);
	}

	async rpush(k, ...values) {
		return this.memory.rpush(k, ...values);
	}

	async lpop(k) {
		return this.memory.lpop(k);
	}

	async rpop(k) {
		return this.memory.rpop(k);
	}

	async lrange(k, start, stop) {
		return this.memory.lrange(k, start, stop);
	}

	async llen(k) {
		return this.memory.llen(k);
	}

	async expire(k, seconds) {
		this.memory.expire(k, seconds);
		return true;
	}

	async ttl(k) {
		return this.memory.ttl(k);
	}

	async size() {
		return this.memory.size;
	}

	async clear() {
		this.memory.clear();
		logger.info('Cache', 'Cache cleared');
		return true;
	}

	async ping() {
		return 0;
	}

	async disconnect() {
		this.memory.clear();
		return true;
	}

	get isRedis() {
		return false;
	}

	get isMemory() {
		return true;
	}

	get status() {
		return {
			type: 'memory',
			connected: true,
			size: this.memory.size,
		};
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