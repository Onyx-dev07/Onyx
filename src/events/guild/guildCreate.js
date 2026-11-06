const { PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const logger = require('../../utils/logger');
const setup = require('../../commands/moderation/setup');

const JOIN_PROMPT_WINDOW_MS = 10 * 60 * 1000;

function canSend(channel, me) {
  if (!channel?.isTextBased()) return false;
  const permissions = channel.permissionsFor(me);
  return Boolean(permissions?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]));
}

module.exports = {
  name: 'guildCreate',
  async execute(guild, client) {
    if (!guild || !guild.available) return;
    if (db.getSetup(guild.id).accepted) return;

    // guildCreate also fires for cached guilds on startup. Only prompt for
    // guilds that were joined recently so restarts do not spam existing servers.
    // joinedTimestamp is null when Discord doesn't populate it on cache load,
    // so skip those instead of falling back to now (which would re-prompt
    // every guild on every restart).
    if (!guild.joinedTimestamp) return;
    if (Date.now() - guild.joinedTimestamp > JOIN_PROMPT_WINDOW_MS) return;

    const payload = setup.introPayload(guild.ownerId);
    const me = guild.members.me;
    if (!me) return;

    const channel = canSend(guild.systemChannel, me)
      ? guild.systemChannel
      : guild.channels.cache.find(candidate => canSend(candidate, me));

    if (channel) {
      await channel.send(payload).catch(err => {
        logger.warn(`[Setup] Failed to send acceptance flow in ${guild.name}:`, err.message);
      });
      return;
    }

    // Fallback to the owner's DMs when no channel is writable.
    const owner = await client.users.fetch(guild.ownerId).catch(() => null);
    if (owner) {
      await owner.send(payload).catch(err => {
        logger.warn(`[Setup] Failed to DM acceptance flow to ${guild.ownerId}:`, err.message);
      });
    }
  }
};
