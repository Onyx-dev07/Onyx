const db = require('../../database');
const logger = require('../../utils/logger');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (!message.guild || message.author.bot) return;
    if (!message.content) return;

    const responders = db.getAutoresponders(message.guild.id);
    if (Object.keys(responders).length === 0) return;

    const trigger = message.content.trim().toLowerCase();
    const response = responders[trigger];
    if (!response) return;

    try {
      await message.reply({
        content: response,
        allowedMentions: { parse: [] }
      });
    } catch (err) {
      logger.error('[AutoResponder] Failed to send response:', err.message);
    }
  }
};
