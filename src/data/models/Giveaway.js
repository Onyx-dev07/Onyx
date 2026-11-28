// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { DataTypes } = require('sequelize');
const BaseModel = require('../BaseModel');

class Giveaway extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false },
                channelId: { type: DataTypes.STRING, allowNull: false },
                messageId: { type: DataTypes.STRING, allowNull: true },
                hostId: { type: DataTypes.STRING, allowNull: false },
                prize: { type: DataTypes.STRING, allowNull: false },
                winners: { type: DataTypes.INTEGER, allowNull: false },
                endTime: { type: DataTypes.BIGINT, allowNull: false },
                ended: { type: DataTypes.BOOLEAN, defaultValue: false }
            },
            {
                sequelize,
                modelName: 'Giveaway',
                tableName: 'giveaways',
                timestamps: true,
                indexes: [
                    { fields: ['ended', 'endTime'] },
                    { fields: ['guildId'] },
                ],
            }
        );

        return this;
    }

    static associate(models) {
        this.hasMany(models.GiveawayEntry, {
            foreignKey: 'giveawayId',
            as: 'entries',
            onDelete: 'CASCADE',
        });
    }
}

module.exports = Giveaway;

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