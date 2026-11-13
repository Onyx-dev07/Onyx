const db = require('../../database');
const logger = require('../../utils/logger');

module.exports = {
  name: 'guildBanRemove',
  async execute(ban, client) {
    const guild = ban.guild;
    const user = ban.user;

    const hardbans = db.getHardbans(guild.id);
    if (hardbans.includes(user.id)) {
      try {
        logger.warn(`User ${user.tag} (${user.id}) was unbanned in ${guild.name} but is on the Onyx Hardban blacklist. Enforcing ban...`);
        await guild.members.ban(user.id, { reason: '[Onyx Security] Automated Hardban Enforcement' });
      } catch (err) {
        logger.error(`Failed to enforce hardban on ${user.id}:`, err);
      }
    }
  }
};

