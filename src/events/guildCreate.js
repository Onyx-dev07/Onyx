import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getGuildConfig, setGuildConfig } from '../services/config/guildConfig.js';
import { registerGuildCommandsForGuild } from '../handlers/loaders/commandLoader.js';

export default {
  name: Events.GuildCreate,
  async execute(guild, client) {
    try {
      logger.info('Bot joined guild', {
        event: 'guild.create',
        guildId: guild.id,
        guildName: guild.name,
        memberCount: guild.memberCount,
      });

      const config = await getGuildConfig(client, guild.id);
      await setGuildConfig(client, guild.id, config);

      // Initial guilds are handled by startup registration. Register
      // guild-scoped commands (Onyx security, `guildCommand` commands, and any
      // community commands beyond the global cap) when the bot joins a guild
      // later so everything is available without a restart.
      if (client.onyxGuildCommandsReady) {
        await registerGuildCommandsForGuild(client, guild, {
          clientId: client.config?.bot?.clientId || process.env.CLIENT_ID,
        });
      }
    } catch (error) {
      logger.error(`Error initializing guild ${guild?.id} on join:`, error);
    }
  },
};
