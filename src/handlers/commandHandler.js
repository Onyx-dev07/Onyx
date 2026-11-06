const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

function loadCommands(client) {
  const commandsPath = path.join(__dirname, '..', 'commands');
  if (!fs.existsSync(commandsPath)) return;

  const categories = fs.readdirSync(commandsPath);
  let totalSlash = 0;
  let totalPrefix = 0;

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    client.categories.add(category);
    const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(categoryPath, file);
      try {
        const command = require(filePath);
        command.category = category;

        // Slash command registration
        if (command.data && command.data.name) {
          client.slashCommands.set(command.data.name, command);
          client.slashArray.push(command.data.toJSON());
          totalSlash++;
        }

        // Prefix command registration
        const prefixName = command.name || command.data?.name;
        if (prefixName) {
          client.commands.set(prefixName, command);
          totalPrefix++;

          if (command.aliases && Array.isArray(command.aliases)) {
            for (const alias of command.aliases) {
              client.aliases.set(alias, prefixName);
            }
          }
        }
      } catch (err) {
        logger.error(`Failed to load command at ${filePath}:`, err);
      }
    }
  }

  logger.command(`Loaded ${totalSlash} slash commands and ${totalPrefix} prefix commands across ${client.categories.size} categories.`);
}

module.exports = { loadCommands };

