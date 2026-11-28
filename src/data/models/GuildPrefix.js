// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');
const config = require('../../config');

const prefixCache = new Map();
const memoryPrefixes = new Map();
const CACHE_TTL = 30000;
const hasDatabase = /^postgres(?:ql)?:\/\//i.test(
    process.env.DATABASE_URL || config.DATABASE_URL || ''
);

class GuildPrefix extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false, unique: true },
                prefix: { type: DataTypes.STRING, allowNull: false },
            },
            {
                sequelize,
                modelName: 'GuildPrefix',
                tableName: 'guild_prefix',
                timestamps: true,
            }
        );

        return this;
    }

    static async getPrefix(guildId) {
        const cached = prefixCache.get(guildId);
        if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.val;

        let val = memoryPrefixes.get(guildId) || null;
        if (hasDatabase) {
            try {
                const record = await this.findOne({ where: { guildId } });
                val = record ? record.prefix : val;
            } catch (err) {
                console.error('[GuildPrefix] Could not read prefix:', err.message);
            }
        }

        prefixCache.set(guildId, { val, ts: Date.now() });
        return val;
    }

    static async setPrefix(guildId, prefix) {
        memoryPrefixes.set(guildId, prefix);
        prefixCache.set(guildId, { val: prefix, ts: Date.now() });

        if (!hasDatabase) return { guildId, prefix };

        try {
            const [record, created] = await this.findOrCreate({
                where: { guildId },
                defaults: { prefix }
            });

            if (!created) {
                record.prefix = prefix;
                await record.save();
            }

            return record;
        } catch (err) {
            console.error('[GuildPrefix] Could not persist prefix:', err.message);
            return { guildId, prefix };
        }
    }

    static async deletePrefix(guildId) {
        memoryPrefixes.delete(guildId);
        this.clearCache(guildId);

        if (!hasDatabase) return true;

        try {
            await this.destroy({ where: { guildId } });
            return true;
        } catch (err) {
            console.error('[GuildPrefix] Could not delete prefix:', err.message);
            return true;
        }
    }

    static clearCache(guildId) {
        if (guildId) prefixCache.delete(guildId);
        else prefixCache.clear();
    }
}

module.exports = GuildPrefix;

/*
: ! Onyx !
    + Discord: Onyx
    + Portfolio: https://github.com/Onyx-dev07
    + Community: https://discord.gg/QnWNz2dKCE  (Onyx )
    + for any queries reach out Community or DM me.
*/

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */