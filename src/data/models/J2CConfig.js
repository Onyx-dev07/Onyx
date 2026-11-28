// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class J2CConfig extends BaseModel {
    static CACHE_KEYS = [['guildId']];
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false, unique: true, comment: 'Discord Guild ID' },
                textChannelId: { type: DataTypes.STRING, allowNull: false, comment: 'Control panel text channel ID' },
                voiceChannelId: { type: DataTypes.STRING, allowNull: false, comment: 'Join to Create trigger voice channel ID' },
                categoryId: { type: DataTypes.STRING, allowNull: false, comment: 'Category for temp VCs' },
            },
            {
                sequelize,
                modelName: 'J2CConfig',
                tableName: 'j2c_config',
                timestamps: true,
                indexes: [
                    {
                        unique: true,
                        fields: ['guildId'],
                    },
                ],
            }
        );
        return this;
    }
}

module.exports = J2CConfig;

/*
: ! Onyx !
    + Discord: Onyx
    + Portfolio: https://github.com/Onyx-dev07
    + Community: https://discord.gg/QnWNz2dKCE  (Onyx )
    + for any queries reach out Community or DM me.
*/

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