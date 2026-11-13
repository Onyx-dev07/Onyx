const { createEmbed, cardAuthor } = require('./embeds');
const config = require('../../config.json');
const logger = require('./logger');

const ACTIONS = {
  ban: {
    title: 'Banned',
    line: 'You have been banned from'
  },
  kick: {
    title: 'Kicked',
    line: 'You have been kicked from'
  },
  hardban: {
    title: 'Permanently banned',
    line: 'You have been permanently banned from'
  },
  softban: {
    title: 'Removed',
    line: 'You have been removed from'
  }
};

/**
 * Sends a moderation DM before the member loses mutual guild access.
 * Returns true when the message was delivered.
 */
async function sendModerationDM(user, { action, guild, reason, moderator }) {
  if (!user) return false;

  const spec = ACTIONS[action] || ACTIONS.kick;
  const guildName = guild?.name || 'the server';
  const reasonText = reason?.trim() || 'No reason provided';

  try {
    await user.send({
      embeds: [createEmbed({
        author: cardAuthor(guildName, guild?.iconURL?.({ size: 128 }) || undefined),
        title: spec.title,
        description: `${spec.line} **${guildName}**.`,
        fields: [
          { name: 'Reason', value: reasonText, inline: false },
          ...(moderator ? [{ name: 'Moderator', value: moderator, inline: true }] : [])
        ],
        color: config.colors.error,
        footer: false
      })]
    });
    return true;
  } catch (err) {
    logger.warn(`Could not DM ${user.tag || user.id}: ${err.message}`);
    return false;
  }
}

module.exports = { sendModerationDM };
