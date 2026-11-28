// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class Favorite extends BaseModel {
    static CACHE_KEYS = [['userId']];
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                userId: { type: DataTypes.STRING, allowNull: false, comment: 'Discord User ID of the owner.' },
                identifier: { type: DataTypes.STRING, allowNull: false },
                title: { type: DataTypes.STRING, allowNull: false },
                author: { type: DataTypes.STRING, allowNull: false },
                length: { type: DataTypes.BIGINT, allowNull: false },
                uri: { type: DataTypes.STRING, allowNull: false },
            },
            {
                sequelize,
                modelName: 'Favorite',
                tableName: 'favorites',
                timestamps: true,
                indexes: [
                    {
                        unique: true,
                        fields: ['userId', 'identifier'],
                    },
                ],
            }
        );
        return this;
    }
}

module.exports = Favorite;

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