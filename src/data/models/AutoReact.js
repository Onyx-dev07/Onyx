const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class AutoReact extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false },
                trigger: { type: DataTypes.STRING, allowNull: false },
                emoji: { type: DataTypes.STRING, allowNull: false },
            },
            {
                sequelize,
                modelName: 'AutoReact',
                tableName: 'auto_react',
                timestamps: true,
                indexes: [
                    { fields: ['guildId'] },
                ],
            }
        );

        return this;
    }
}

module.exports = AutoReact;

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */