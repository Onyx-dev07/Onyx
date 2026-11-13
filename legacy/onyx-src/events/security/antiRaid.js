const db = require('../../database');
const logger = require('../../utils/logger');
const { errorEmbed } = require('../../utils/embeds');

const recentJoins = new Map(); // guildId -> array of timestamps

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    if (!member.guild) return;
    const guild = member.guild;
    const antiRaid = db.getAntiRaid(guild.id);

    if (!antiRaid || !antiRaid.enabled) return;

    const now = Date.now();
    const accountAgeMs = now - member.user.createdTimestamp;
    const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);

    // 1. Account Age Check (Alt Filter)
    if (antiRaid.minAccountAgeDays > 0 && accountAgeDays < antiRaid.minAccountAgeDays) {
      logger.warn(`[AntiRaid] Intercepted new account ${member.user.tag} (Age: ${accountAgeDays.toFixed(1)} days) in ${guild.name}`);
      const reason = `[Onyx AntiRaid] Account age (${accountAgeDays.toFixed(1)} days) below server requirement (${antiRaid.minAccountAgeDays} days)`;

      try {
        if (antiRaid.action === 'ban' && member.bannable) {
          await member.ban({ reason });
        } else if (member.kickable) {
          await member.kick(reason);
        }
        sendRaidAlert(guild, member.user, `Account Age Gate (${accountAgeDays.toFixed(1)} days old)`, antiRaid.action);
        return;
      } catch (err) {
        logger.error('[AntiRaid] Failed to mitigate alt account:', err);
      }
    }

    // 2. Mass Join Surge Detection
    const joins = recentJoins.get(guild.id) || [];
    const validJoins = joins.filter(t => now - t < 10000);
    validJoins.push(now);
    recentJoins.set(guild.id, validJoins);

    const limit = antiRaid.massJoinLimit || 5;
    if (validJoins.length > limit) {
      logger.warn(`[AntiRaid] Mass join surge detected in ${guild.name}! (${validJoins.length} joins in 10s)`);
      const reason = `[Onyx AntiRaid] Mass join surge detected`;

      try {
        if (antiRaid.action === 'ban' && member.bannable) {
          await member.ban({ reason });
        } else if (member.kickable) {
          await member.kick(reason);
        }
        sendRaidAlert(guild, member.user, `Mass Join Raid Detection (${validJoins.length} joins/10s)`, antiRaid.action);
      } catch (err) {}
    }
  }
};

async function sendRaidAlert(guild, user, triggerReason, action) {
  // Prefer the dedicated AntiNuke log channel, fall back to mod-logs.
  const antiNuke = db.getAntiNuke(guild.id);
  let channel = null;

  if (antiNuke?.logChannelId) {
    channel = guild.channels.cache.get(antiNuke.logChannelId)
      || await guild.channels.fetch(antiNuke.logChannelId).catch(() => null);
  }

  if (!channel) {
    const modLogs = db.getModLogs(guild.id);
    if (modLogs?.enabled && modLogs.channelId) {
      channel = guild.channels.cache.get(modLogs.channelId)
        || await guild.channels.fetch(modLogs.channelId).catch(() => null);
    }
  }

  if (!channel) return;

  const embed = errorEmbed(
    `**AntiRaid protection triggered**\n\n• **User:** ${user.tag} (\`${user.id}\`)\n• **Reason:** ${triggerReason}\n• **Action taken:** ${action.toUpperCase()}`
  );
  await channel.send({ embeds: [embed] }).catch(() => {});
}

