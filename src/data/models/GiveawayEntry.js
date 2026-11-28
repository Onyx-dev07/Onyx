// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { DataTypes } = require('sequelize');
const BaseModel = require('../BaseModel');

class GiveawayEntry extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                giveawayId: { type: DataTypes.INTEGER, allowNull: false },
                userId: { type: DataTypes.STRING, allowNull: false }
            },
            {
                sequelize,
                modelName: 'GiveawayEntry',
                tableName: 'giveaway_entries',
                timestamps: true,
                indexes: [
                    { fields: ['giveawayId'] },
                    { fields: ['giveawayId', 'userId'], unique: true },
                ],
            }
        );

        return this;
    }

    static associate(models) {
        this.belongsTo(models.Giveaway, {
            foreignKey: 'giveawayId',
            as: 'giveaway',
        });
    }
}

module.exports = GiveawayEntry;

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