// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

/**
 * Database Models Index
 * Initializes all models and sets up associations
 */

const sequelize = require('../sequelize');
const NoPrefix = require('./NoPrefix');
const AFK = require('./AFK');
const J2CConfig = require('./J2CConfig');
const TempChannel = require('./TempChannel');
const Todo = require('./Todo');
const GuildPrefix = require('./GuildPrefix');
const Blacklist = require('./Blacklist');
const LoggingConfig = require('./LoggingConfig');
const WelcomeConfig = require('./WelcomeConfig');
const FarewellConfig = require('./FarewellConfig');
const Profile = require('./Profile');
const AutoReact = require('./AutoReact');
const AntinukeConfig = require('./AntinukeConfig');
const AntinukeWhitelist = require('./AntinukeWhitelist');
const AutomodConfig = require('./AutomodConfig');
const AutomodWhitelist = require('./AutomodWhitelist');
const GuildConfig = require('./GuildConfig');
const ModLog = require('./ModLog');
const Favorite = require('./Favorite');
const Playlist = require('./Playlist');
const PlaylistTrack = require('./PlaylistTrack');
const Giveaway = require('./Giveaway');
const GiveawayEntry = require('./GiveawayEntry');
const ReactionRoles = require('./ReactionRoles');
const TicketConfig = require('./TicketConfig');
const TicketCategory = require('./TicketCategory');
const Ticket = require('./Ticket');


// Initialize all models
NoPrefix.init(sequelize);
AFK.init(sequelize);
J2CConfig.init(sequelize);
TempChannel.init(sequelize);
Todo.init(sequelize);
GuildPrefix.init(sequelize);
Blacklist.init(sequelize);
LoggingConfig.init(sequelize);
WelcomeConfig.init(sequelize);
FarewellConfig.init(sequelize);
Profile.init(sequelize);
AutoReact.init(sequelize);
AntinukeConfig.init(sequelize);
AntinukeWhitelist.init(sequelize);
AutomodConfig.init(sequelize);
AutomodWhitelist.init(sequelize);
GuildConfig.init(sequelize);
ModLog.init(sequelize);
Favorite.init(sequelize);
Playlist.init(sequelize);
PlaylistTrack.init(sequelize);
Giveaway.init(sequelize);
GiveawayEntry.init(sequelize);
TicketConfig.init(sequelize);
TicketCategory.init(sequelize);
Ticket.init(sequelize);

const models = {
    NoPrefix,
    AFK,
    J2CConfig,
    TempChannel,
    Todo,
    GuildPrefix,
    Blacklist,
    LoggingConfig,
    WelcomeConfig,
    FarewellConfig,
    Profile,
    AutoReact,
    AntinukeConfig,
    AntinukeWhitelist,
    AutomodConfig,
    AutomodWhitelist,
    GuildConfig,
    ModLog,
    Favorite,
    Playlist,
    PlaylistTrack,
    Giveaway,
    GiveawayEntry,
    ReactionRoles,
    TicketConfig,
    TicketCategory,
    Ticket,
    sequelize
};

Object.values(models).forEach(model => {
    if (model.associate && typeof model.associate === 'function') {
        model.associate(models);
    }
});

async function safeAddIndex(qi, table, fields, options = {}) {
    try {
        await qi.addIndex(table, fields, options);
    } catch (e) {
        const msg = e.message || '';
        if (msg.includes('already exists') || e.original?.code === '42P07' || e.original?.code === '42701') return;
        throw e;
    }
}

const config = require('../../config');
const hasDatabase = /^postgres(?:ql)?:\/\//i.test(
    process.env.DATABASE_URL || config.DATABASE_URL || ''
);

const syncDatabase = async () => {
    if (!hasDatabase) return false;

    await sequelize.sync();

    const qi = sequelize.getQueryInterface();

    const ticketConfigCols = await qi.describeTable('ticket_config').catch(() => null);
    if (ticketConfigCols && !ticketConfigCols.additionalRoleIds) {
        await qi.addColumn('ticket_config', 'additionalRoleIds', {
            type: require('sequelize').DataTypes.TEXT,
            allowNull: true,
            defaultValue: '[]'
        });
    }
    if (ticketConfigCols && !ticketConfigCols.panelMessageId) {
        await qi.addColumn('ticket_config', 'panelMessageId', {
            type: require('sequelize').DataTypes.STRING,
            allowNull: true
        });
    }

    await Promise.all([
        safeAddIndex(qi, 'giveaways',       ['ended', 'endTime'],          { name: 'giveaways_ended_endtime' }),
        safeAddIndex(qi, 'giveaways',       ['guildId'],                   { name: 'giveaways_guild_id' }),
        safeAddIndex(qi, 'giveaway_entries',['giveawayId'],                { name: 'giveaway_entries_giveaway_id' }),
        safeAddIndex(qi, 'giveaway_entries',['giveawayId', 'userId'],      { name: 'giveaway_entries_giveaway_user', unique: true }),
        safeAddIndex(qi, 'auto_react',      ['guildId'],                   { name: 'auto_react_guild_id' }),
        safeAddIndex(qi, 'ticket_categories',['guildId'],                  { name: 'ticket_categories_guild_id' }),
        safeAddIndex(qi, 'ticket_categories',['guildId', 'categoryName'],  { name: 'ticket_categories_guild_category' }),
    ]);

    return true;
};

const dbReady = Promise.race([
    syncDatabase(),
    new Promise((resolve) => setTimeout(() => resolve(false), 5000)),
]).catch((err) => {
    console.error('Database sync error:', err.message);
    return false;
});

models.dbReady = dbReady;

module.exports = models;

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