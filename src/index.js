require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const logger = require('./utils/logger');
const config = require('../config.json');

const token = process.env.DISCORD_TOKEN;

if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
  logger.warn('=====================================================');
  logger.warn(`${config.botName} Token is missing or not configured!`);
  logger.warn('Please open .env and set DISCORD_TOKEN=your_token_here');
  logger.warn('=====================================================');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember
  ]
});

// Collections
client.commands = new Collection();
client.slashCommands = new Collection();
client.aliases = new Collection();
client.slashArray = [];
client.categories = new Set();
client.snipes = new Map();
client.editSnipes = new Map();

// Load modules
loadCommands(client);
loadEvents(client);

// Unhandled error protection
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
});

process.on('uncaughtExceptionMonitor', (err, origin) => {
  logger.error('Uncaught Exception Monitor:', err, origin);
});

// Login
if (token && token !== 'YOUR_BOT_TOKEN_HERE') {
  client.login(token).catch(err => {
    logger.error('Failed to log in to Discord:', err.message);
  });
} else {
  logger.info(`${config.botName} is ready for configuration. Fill in .env to connect to Discord.`);
}

module.exports = client;

