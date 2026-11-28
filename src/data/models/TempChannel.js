// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class TempChannel extends BaseModel {
    static CACHE_KEYS = [['channelId'], ['guildId', 'ownerId']];
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                channelId: { type: DataTypes.STRING, allowNull: false, unique: true, comment: 'Discord Voice Channel ID' },
                guildId: { type: DataTypes.STRING, allowNull: false, comment: 'Discord Guild ID' },
                ownerId: { type: DataTypes.STRING, allowNull: false, comment: 'Discord User ID of owner' },
            },
            {
                sequelize,
                modelName: 'TempChannel',
                tableName: 'temp_channels',
                timestamps: false,
                indexes: [
                    {
                        unique: true,
                        fields: ['channelId'],
                    },
                    {
                        fields: ['guildId', 'ownerId'],
                    },
                ],
            }
        );
        return this;
    }
}

module.exports = TempChannel;

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