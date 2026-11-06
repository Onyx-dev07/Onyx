const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

function loadEvents(client) {
  const eventsPath = path.join(__dirname, '..', 'events');
  if (!fs.existsSync(eventsPath)) return;

  const folders = fs.readdirSync(eventsPath);
  let totalEvents = 0;

  for (const folder of folders) {
    const folderPath = path.join(eventsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      try {
        const event = require(filePath);
        const eventName = event.name || file.replace('.js', '');

        if (event.once) {
          client.once(eventName, (...args) => event.execute(...args, client));
        } else {
          client.on(eventName, (...args) => event.execute(...args, client));
        }
        totalEvents++;
      } catch (err) {
        logger.error(`Failed to load event at ${filePath}:`, err);
      }
    }
  }

  logger.event(`Loaded ${totalEvents} event listeners.`);
}

module.exports = { loadEvents };

