require('dotenv').config();
const { REST, Routes, InteractionContextType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');
const config = require('../config.json');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
  logger.error('Missing DISCORD_TOKEN in .env. Please configure it before deploying commands.');
  process.exit(1);
}

if (!clientId || clientId === 'YOUR_CLIENT_ID_HERE') {
  logger.error('Missing CLIENT_ID in .env. Please configure your Discord Application ID before deploying commands.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const categories = fs.readdirSync(commandsPath);

for (const category of categories) {
  const categoryPath = path.join(commandsPath, category);
  if (!fs.statSync(categoryPath).isDirectory()) continue;

  const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const command = require(path.join(categoryPath, file));
    if (command.data && command.data.toJSON) {
      const json = command.data.toJSON();
      // Every command is server-scoped; keep them out of DMs where handlers
      // would otherwise dereference a null guild.
      if (!json.contexts) json.contexts = [InteractionContextType.Guild];
      commands.push(json);
    }
  }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands for ${config.botName}...`);

    if (guildId && guildId.trim()) {
      logger.info(`Deploying guild-specific commands to guild ID: ${guildId}`);
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      logger.success(`Successfully registered ${commands.length} slash commands to development guild.`);
    } else {
      logger.info('Deploying slash commands globally to all Discord servers...');
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      logger.success(`Successfully registered ${commands.length} slash commands globally.`);
    }
  } catch (error) {
    logger.error('Failed to register application commands:', error);
  }
})();

