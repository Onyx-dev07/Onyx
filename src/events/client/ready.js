const { ActivityType } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../../config.json');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    const banner = `
  ██████╗ ███╗   ██╗██╗   ██╗██╗  ██╗
 ██╔═══██╗████╗  ██║╚██╗ ██╔╝╚██╗██╔╝
 ██║   ██║██╔██╗ ██║ ╚████╔╝  ╚███╔╝ 
 ██║   ██║██║╚██╗██║  ╚██╔╝   ██╔██╗ 
 ╚██████╔╝██║ ╚████║   ██║   ██╔╝ ██╗
  ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝
    `;
    console.log(banner);
    logger.onyx(`${config.botName} is online and operational!`);
    logger.info(`Logged in as: ${client.user.tag} (ID: ${client.user.id})`);
    logger.info(`Serving ${client.guilds.cache.size} guilds and ${client.users.cache.size} cached users.`);

    // Presence rotation
    const presences = config.presences || [];
    if (presences.length > 0) {
      let index = 0;
      const updatePresence = () => {
        const p = presences[index % presences.length];
        const totalMembers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
        const name = p.name
          .replace('{guildCount}', client.guilds.cache.size)
          .replace('{memberCount}', totalMembers);

        let type = ActivityType.Playing;
        if (p.type === 'WATCHING') type = ActivityType.Watching;
        else if (p.type === 'LISTENING') type = ActivityType.Listening;
        else if (p.type === 'COMPETING') type = ActivityType.Competing;

        client.user.setPresence({
          activities: [{ name, type }],
          status: 'online'
        });
        index++;
      };

      updatePresence();
      setInterval(updatePresence, (config.presenceIntervalSeconds || 15) * 1000);
    }
  }
};

