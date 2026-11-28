// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { DataTypes } = require('sequelize');

const Blacklist = {
  name: 'Blacklist',

  init(sequelize) {
    this.model = sequelize.define('Blacklist', {
      type: {
        type: DataTypes.ENUM('user', 'guild'),
        allowNull: false,
        validate: {
          isIn: [['user', 'guild']]
        }
      },
      entityId: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      addedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      timestamps: false,
      indexes: [
        {
          fields: ['type', 'entityId'],
          unique: true
        }
      ]
    });

    return this.model;
  },

  associate(models) {
    // No associations
  }
};

module.exports = Blacklist;

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