const db = require('../../database');
const logger = require('../../utils/logger');
const { isTrusted, sendSecurityAlert, alertBody } = require('../../utils/security');

const TIMEOUT_MS = 60 * 60 * 1000; // 1 hour, matching Olympus

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;
    if (!message.mentions.everyone) return;

    const guild = message.guild;
    const anti = db.getAntiNuke(guild.id);
    if (!anti || !anti.enabled) return;

    // Trusted members may ping everyone until their Limit System threshold is exceeded.
    if (isTrusted(guild, message.author.id, client, 'everyone')) return;

    try {
      logger.warn(`[AntiNuke] Unauthorized @everyone/@here mention in ${guild.name} by ${message.author.tag}! Mitigating...`);

      const recent = await message.channel.messages.fetch({ limit: 20 }).catch(() => null);
      if (recent) {
        const offenders = recent.filter(m => m.author.id === message.author.id && m.mentions.everyone);
        for (const msg of offenders.values()) {
          await msg.delete().catch(() => {});
        }
      } else {
        await message.delete().catch(() => {});
      }

      let timedOut = false;
      if (message.member?.moderatable) {
        timedOut = await message.member
          .timeout(TIMEOUT_MS, '[Onyx AntiNuke] Unauthorized @everyone/@here mention')
          .then(() => true)
          .catch(() => false);
      }

      await sendSecurityAlert(
        guild,
        'AntiNuke: Mass Mention Neutralized',
        alertBody(
          message.author,
          [`**Channel:** #${message.channel.name} (\`${message.channel.id}\`)`],
          timedOut ? 'Message(s) deleted & offender timed out for 1 hour.' : 'Message(s) deleted (timeout failed — check role hierarchy).'
        )
      );
    } catch (err) {
      logger.error('Error in antiEveryone event:', err);
    }
  }
};
