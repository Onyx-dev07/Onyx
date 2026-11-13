const { AuditLogEvent } = require('discord.js');
const db = require('../database');
const logger = require('./logger');
const limitSystem = require('./limitSystem');
const antiBetray = require('./antiBetray');
const { alertEmbed } = require('./embeds');

// Audit log entries older than this are treated as stale (avoids acting on unrelated history)
const MAX_AUDIT_AGE_MS = 15000;
const BREACH_NOTIFY_COOLDOWN_MS = 30000;

// Suppresses duplicate enforcement/alerts while a breached user keeps acting.
const recentBreaches = new Map();

/**
 * Returns true when the user is trusted for an AntiNuke action.
 *
 * Server staff are trusted up to the Limit System threshold for that event.
 * Exceeding the threshold revokes the whitelist for the action, contains the
 * offender, and returns false so the calling security event can neutralize.
 * Extra owners are monitored too — Anti-Betray overrides their trust.
 */
function isTrusted(guild, userId, client, action = 'all') {
  if (!userId) return true;
  if (userId === client.user.id) return true;
  if (userId === guild.ownerId) return true;
  if (!db.isWhitelisted(guild.id, userId, action)) return false;

  const limits = db.getLimits(guild.id);
  if (!limits || !limits.enabled) return true;

  const threshold = Number(limits.thresholds?.[action] ?? 0);
  if (!threshold) return true;

  const result = limitSystem.record(guild.id, userId, action);
  if (!result.exceeded) return true;

  const key = `${guild.id}:${userId}:${action}`;
  const now = Date.now();
  if (now - (recentBreaches.get(key) || 0) > BREACH_NOTIFY_COOLDOWN_MS) {
    recentBreaches.set(key, now);
    void handleLimitBreach(guild, userId, action, result);
  }

  return false;
}

async function handleLimitBreach(guild, userId, action, result) {
  try {
    const enforcement = await limitSystem.enforce(guild, userId, action);
    const betray = await antiBetray.evaluate(guild, userId, action);
    const minutes = Math.max(1, Math.round(result.windowSeconds / 60));

    const rolesLine = enforcement.removedRoles.length
      ? `${enforcement.removedRoles.length} dangerous role(s) removed`
      : 'No removable dangerous roles';
    const quarantineLine = enforcement.quarantined
      ? 'Quarantine role applied'
      : enforcement.timedOut
        ? '24 hour timeout applied'
        : enforcement.member?.user?.bot
          ? 'Bot containment handled by AntiNuke'
          : 'Timeout unavailable — check role hierarchy';
    const betrayLine = betray.triggered
      ? betray.lockdown
        ? `Engaged · ${betray.lockedChannels} channel(s) locked down`
        : 'Engaged · server lockdown already active'
      : 'Standby';

    await sendSecurityAlert(
      guild,
      betray.triggered
        ? 'Anti-Betray Emergency: Trusted Entity Contained'
        : 'Limit System Triggered',
      [
        '**Whitelist override engaged — trusted access revoked.**',
        '',
        `• **Offender:** <@${userId}> (\`${userId}\`)`,
        `• **Event:** ${limitSystem.label(action)}`,
        `• **Threshold:** ${result.count}/${result.threshold} in ${minutes}m`,
        `• **Roles Removed:** ${rolesLine}`,
        `• **Quarantine:** ${quarantineLine}`,
        `• **Anti-Betray:** ${betrayLine}`,
        `• **Action Taken:** Whitelist overridden and containment dispatched.`
      ].join('\n')
    );
  } catch (err) {
    logger.error('[Limit] Failed to handle limit breach:', err);
  }
}

/**
 * Fetches the most recent matching audit log entry for a guild action.
 */
async function fetchAuditEntry(guild, type, { targetId = null, maxAgeMs = MAX_AUDIT_AGE_MS } = {}) {
  const logs = await guild.fetchAuditLogs({ limit: 5, type }).catch(() => null);
  if (!logs) return null;

  const entry = logs.entries.find(e => {
    if (!e.executor) return false;
    if (targetId && e.target?.id !== targetId) return false;
    return Date.now() - e.createdTimestamp <= maxAgeMs;
  });

  return entry || null;
}

/**
 * Bans a rogue executor. Returns true when the punishment was applied.
 */
async function neutralize(guild, executor, reason) {
  try {
    await guild.members.ban(executor.id, { reason: `[Onyx AntiNuke] ${reason}` });
    logger.info(`[AntiNuke] Banned ${executor.tag || executor.id} for: ${reason}`);
    return true;
  } catch (err) {
    logger.error(`[AntiNuke] Failed to ban ${executor.tag || executor.id}:`, err.message);
    return false;
  }
}

/**
 * Resolves the preferred AntiNuke log channel: onyx-antinuke-logs first,
 * falling back to the configured mod-logs channel. Returns [channel, source]
 * or [null, null] when none is available.
 */
async function resolveAntiNukeLogChannel(guild) {
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
      return channel ? [channel, 'modlogs'] : [null, null];
    }
  }

  return channel ? [channel, 'antinuke'] : [null, null];
}

/**
 * Sends an AntiNuke alert to the onyx-antinuke-logs channel (created during
 * /antinuke enable), falling back to the configured mod-logs channel.
 */
async function sendSecurityAlert(guild, title, description) {
  try {
    const [channel] = await resolveAntiNukeLogChannel(guild);
    if (!channel) return;

    await channel.send({ embeds: [alertEmbed({ title, description })] }).catch(() => {});
  } catch (err) {
    logger.error('[AntiNuke] Failed to send security alert:', err.message);
  }
}

/**
 * Builds the standard "offender / action taken" alert body.
 */
function alertBody(executor, details, actionTaken) {
  return [
    '**Offender**',
    `${executor.tag || executor.id} \`${executor.id}\``,
    '',
    ...details.map(line => `• ${line}`),
    '',
    '**Action taken**',
    actionTaken
  ].join('\n');
}

module.exports = {
  AuditLogEvent,
  MAX_AUDIT_AGE_MS,
  isTrusted,
  fetchAuditEntry,
  neutralize,
  sendSecurityAlert,
  alertBody
};
