// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, ActivityType } = require('discord.js');
const Dokdo = require('dokdo');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const dbStatus = require('./data/dbStatus');
const { loadSlashCommands, loadPrefixCommands, loadHybridCommands, reloadAllCommands } = require('./lib/commandLoader');
const { colors, printHeader, printLoading, printSuccess, printError, printInfo, printSystemReady } = require('./lib/consoleLogger');
const botLogger    = require('./lib/botLogger');
const { startHealthServer } = require('./healthServer');

// Render Web Services need $PORT bound before any long-running initialization.
startHealthServer();

printHeader();

const _emitWarning = process.emitWarning;
process.emitWarning = (warning, ...args) => {
  const msg = typeof warning === 'string' ? warning : warning?.message ?? '';
  if (msg.includes('ready event has been renamed to clientReady')) return;
  return _emitWarning.call(process, warning, ...args);
};

process.on('unhandledRejection', (error) => {
  const message = error?.message ?? String(error);
  if (/127\.0\.0\.1:5432/.test(message)) {
    dbStatus.disableDatabase(error, 'unhandled rejection');
    return;
  }
  printError(`Unhandled rejection: ${message}`);
});

process.on('uncaughtException', (error) => {
  printError(`Uncaught exception: ${error.message}`);
});

(async () => {
  global.onyx = {
    bot: { color: '#5865F2' },
    addons: {
      ai: { geminiApiKeys: null }
    },
    db: { timezone: '+00:00' }
  };

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
  });

  client.commands = new Collection();
  client.prefixCommands = new Collection();

  if (!process.env.SHELL) process.env.SHELL = '/bin/bash';

  client.dokdo = new Dokdo.Client(client, {
    prefix: config.PREFIX,
    aliases: ['dok', 'jsk'],
    owners: [config.OWNER_ID],
    secrets: [config.BOT_TOKEN]
  });

  client.reloadAllCommands = function () {
    try {
      return reloadAllCommands(this, __dirname);
    } catch (error) {
      return { success: false, message: 'Failed to reload commands', error: error.stack };
    }
  };

  const commandsPath  = path.join(__dirname, 'commands/slash');
  const pCommandsPath = path.join(__dirname, 'commands/prefix');
  const hybridPath    = path.join(__dirname, 'hybrid');

  loadSlashCommands(client, commandsPath);
  loadPrefixCommands(client, pCommandsPath);
  loadHybridCommands(client, hybridPath);

  printLoading('Event handlers');
  const eventsPath = path.join(__dirname, 'gateway');
  let loadedEvents = 0;

  if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      if ('name' in event && 'execute' in event) {
        client.on(event.name, (...args) => event.execute(...args, client));
        loadedEvents++;
      }
    }

    const eventSubdirs = ['logging', 'antinuke', 'automod'];
    const subdirsLoaded = [];
    for (const subdir of eventSubdirs) {
      const subdirPath = path.join(eventsPath, subdir);
      if (!fs.existsSync(subdirPath)) continue;
      const files = fs.readdirSync(subdirPath).filter(f => f.endsWith('.js'));
      for (const file of files) {
        const mod = require(path.join(subdirPath, file));
        if ('init' in mod && typeof mod.init === 'function') mod.init(client);
      }
      subdirsLoaded.push(subdir);
    }

    const standaloneInits = [
      { file: 'welcomeEvent.js', label: 'welcome' },
      { file: 'farewellEvent.js', label: 'farewell' },
      { file: 'snipeEvent.js',   label: 'snipe' }
    ];
    const standaloneLoaded = [];
    for (const { file, label } of standaloneInits) {
      const filePath = path.join(eventsPath, file);
      if (!fs.existsSync(filePath)) continue;
      const mod = require(filePath);
      if ('init' in mod && typeof mod.init === 'function') {
        mod.init(client);
        standaloneLoaded.push(label);
      }
    }

    const allModules = [...subdirsLoaded, ...standaloneLoaded].join(', ');
    printSuccess(`Event handlers ready — ${loadedEvents} events · ${allModules}`);
  } else {
    printInfo('No events directory found, skipping event loading');
  }

  printLoading('Database connection');
  const models = require('./data/models');

  const dbModules = {
    aiChannel:   require('./data/aiChannel'),
    aiHistory:   require('./data/aiHistory'),
    autobump:    require('./data/autobump'),
    autopost:    require('./data/autopost'),
    commandLock: require('./data/commandLock'),
    feedback:    require('./data/feedback'),
    userStats:   require('./data/userStats'),
    vanityRoles: require('./data/vanityRoles'),
    ignoreDb:    require('./data/ignoreDb'),
    mediaDb:     require('./data/mediaDb'),
    reminders:   require('./data/reminders'),
  };

  const COMMAND_HASH_FILE = path.join(__dirname, '.command_hash');

  async function registerCommands() {
    const commands = [];
    for (const command of client.commands.values()) {
      const commandData = command.data.toJSON();
      commandData.integration_types = [0, 1];
      commandData.contexts = [0, 1, 2];
      commands.push(commandData);
    }

    const currentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(commands))
      .digest('hex');

    let savedHash = null;
    try { savedHash = fs.readFileSync(COMMAND_HASH_FILE, 'utf8').trim(); } catch (_) {}

    if (savedHash === currentHash) {
      printInfo('Slash commands unchanged — skipping registration');
      return;
    }

    const rest = new REST({ version: '10' }).setToken(config.BOT_TOKEN);
    await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body: commands });
    fs.writeFileSync(COMMAND_HASH_FILE, currentHash, 'utf8');
  }

  async function gracefulShutdown(signal) {
    console.log(`\n${colors.YELLOW}⚠${colors.RESET}  Received ${signal}, shutting down gracefully...`);
    client.destroy();
    try { await models.sequelize.close(); } catch (_) {}
    process.exit(0);
  }

  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  client.on('error', (error) => {
    const message = error?.message ?? String(error);
    if (/127\.0\.0\.1:5432/.test(message)) {
      dbStatus.disableDatabase(error, 'Discord client error');
      return;
    }
    printError(`Discord client error: ${message}`);
    botLogger.logError(error, 'Discord client error', client).catch(() => {});
  });

  client.once('clientReady', async () => {
    printSuccess(`Authentication successful → ${colors.PURPLE}${client.user.tag}${colors.RESET}`);

    botLogger.init(client);

    client.user.setPresence({
      status: config.STATUS.status,
      activities: [{ name: config.STATUS.activity, type: ActivityType.Listening }]
    });

    printLoading('Synchronizing slash commands');
    try {
      await registerCommands();
      printSuccess(`Command synchronization complete (${client.commands.size} commands)`);
    } catch (error) {
      printError(`Failed to register commands: ${error.message}`);
    }

    printInfo(`Connected to ${client.guilds.cache.size} guilds`);

    try {
      const { checkGiveaways } = require('./lib/giveawayUtils');
      setInterval(() => { checkGiveaways(client); }, 10000);

      const { startBackgroundRefresh: startAnimalRefresh } = require('./lib/animalApi');
      startAnimalRefresh();

      const { startBackgroundRefresh } = require('./lib/pfpApi');
      startBackgroundRefresh();
    } catch (error) {
      printError('Failed to initialize database-dependent systems: ' + error.message);
    }

    printSystemReady();
  });

  try {
    const dbResults = await Promise.all([
      models.dbReady,
      ...Object.values(dbModules).map(m => m.dbReady)
    ]);
    if (dbResults.some(Boolean)) printSuccess('Database setup complete');
    else printInfo('Database unavailable — continuing without database-backed features');
  } catch (err) {
    printError('Database initialization failed — continuing without database features: ' + err.message);
  }

  if (!config.BOT_TOKEN) {
    printError('DISCORD_TOKEN is not set — health server is running, but Discord login was skipped.');
    return;
  }

  printLoading('Discord authentication');
  try {
    await client.login(config.BOT_TOKEN);
  } catch (error) {
    printError(`Discord login failed: ${error.message}`);
  }
})();

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */