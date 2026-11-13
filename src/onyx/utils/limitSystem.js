const { PermissionFlagsBits } = require('discord.js');
const db = require('../database');
const logger = require('./logger');

// Human-readable names shared by the alert and the `/limits` dashboard.
const ACTION_LABELS = {
  ban: 'Anti Ban',
  kick: 'Anti Kick',
  botadd: 'Anti Bot Add',
  chcr: 'Anti Channel Create',
  chdl: 'Anti Channel Delete',
  chup: 'Anti Channel Update',
  rlcr: 'Anti Role Create',
  rldl: 'Anti Role Delete',
  rlup: 'Anti Role Update',
  memup: 'Anti Member Role Update',
  everyone: 'Anti Everyone',
  guildup: 'Anti Guild Update',
  intg: 'Anti Integration',
  webhook: 'Anti Webhook',
  prune: 'Anti Prune'
};

// Permissions that can be used to damage a server. Roles holding any of these
// are stripped when a trusted entity breaches a limit.
const DANGEROUS_PERMISSIONS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.MentionEveryone
];

const CONTAINMENT_TIMEOUT_MS = 24 * 60 * 60 * 1000;

// guildId:userId:action -> array of event timestamps
const buckets = new Map();

function label(action) {
  return ACTION_LABELS[action] || action;
}

function bucketKey(guildId, userId, action) {
  return `${guildId}:${userId}:${action}`;
}

function prune(list, cutoff) {
  while (list.length && list[0] <= cutoff) list.shift();
  return list;
}

function windowSecondsFor(settings) {
  return Math.max(10, Number(settings?.windowSeconds) || 600);
}

/**
 * Records one event for a user and reports whether the configured threshold
 * was exceeded inside the active window.
 */
function record(guildId, userId, action) {
  const settings = db.getLimits(guildId);
  const windowSeconds = windowSecondsFor(settings);
  const threshold = Number(settings?.thresholds?.[action] ?? 0);

  if (!settings?.enabled || !threshold) {
    return { tracked: false, exceeded: false, count: 0, threshold, windowSeconds };
  }

  const now = Date.now();
  const key = bucketKey(guildId, userId, action);
  const list = prune(buckets.get(key) || [], now - windowSeconds * 1000);
  list.push(now);
  buckets.set(key, list);

  return {
    tracked: true,
    exceeded: list.length > threshold,
    count: list.length,
    threshold,
    windowSeconds
  };
}

function hasDangerous(permissions) {
  if (!permissions) return false;
  return DANGEROUS_PERMISSIONS.some(permission => permissions.has(permission));
}

/**
 * Immediately contains an offender: removes roles carrying dangerous
 * permissions, applies a temporary timeout where Discord allows it, and
 * assigns the configured quarantine role (if present).
 */
async function enforce(guild, userId, action) {
  const result = {
    userId,
    member: null,
    removedRoles: [],
    timedOut: false,
    quarantined: false,
    error: null
  };

  if (!guild || !userId) {
    result.error = 'Missing guild or user';
    return result;
  }

  if (userId === guild.ownerId) {
    result.error = 'Server owner is exempt from containment';
    return result;
  }

  try {
    result.member = await guild.members.fetch(userId);
  } catch {
    result.error = 'Member could not be fetched';
    return result;
  }

  const member = result.member;
  const reason = `[Onyx Limit] ${label(action)} threshold exceeded`;

  for (const role of member.roles.cache.values()) {
    if (role.id === guild.id || role.managed) continue;
    if (!hasDangerous(role.permissions)) continue;

    try {
      await member.roles.remove(role, reason);
      result.removedRoles.push(role.name);
    } catch (err) {
      logger.error(`[Limit] Failed to remove role ${role.name} from ${userId}:`, err.message);
    }
  }

  // Assign quarantine role so the offender loses general access even when
  // timeout is unavailable or the ban path is not taken.
  const antiNuke = db.getAntiNuke(guild.id);
  const quarantineId = antiNuke?.roles?.quarantine;
  if (quarantineId) {
    const quarantineRole = guild.roles.cache.get(quarantineId);
    if (quarantineRole && quarantineRole.position < member.roles.highest.position) {
      try {
        await member.roles.add(quarantineRole, reason);
        result.quarantined = true;
      } catch (err) {
        logger.error(`[Limit] Failed to add quarantine role to ${userId}:`, err.message);
      }
    }
  }

  if (!member.user.bot && member.moderatable) {
    try {
      await member.timeout(CONTAINMENT_TIMEOUT_MS, reason);
      result.timedOut = true;
    } catch (err) {
      logger.error(`[Limit] Failed to timeout ${userId}:`, err.message);
    }
  }

  logger.warn(
    `[Limit] Contained ${member.user.tag || userId} in ${guild.name} after ${label(action)} breach ` +
    `(${result.removedRoles.length} roles removed, quarantine: ${result.quarantined}, timeout: ${result.timedOut})`
  );

  return result;
}

/**
 * Returns the current window usage for a guild, highest count first.
 */
function getGuildUsage(guildId) {
  const settings = db.getLimits(guildId);
  const cutoff = Date.now() - windowSecondsFor(settings) * 1000;
  const usage = [];

  for (const [key, list] of buckets) {
    if (!key.startsWith(`${guildId}:`)) continue;

    prune(list, cutoff);
    if (!list.length) {
      buckets.delete(key);
      continue;
    }

    const [, userId, action] = key.split(':');
    usage.push({ userId, action, count: list.length });
  }

  return usage.sort((a, b) => b.count - a.count);
}

function clearGuild(guildId) {
  for (const key of buckets.keys()) {
    if (key.startsWith(`${guildId}:`)) buckets.delete(key);
  }
}

module.exports = {
  ACTION_LABELS,
  DANGEROUS_PERMISSIONS,
  CONTAINMENT_TIMEOUT_MS,
  label,
  record,
  enforce,
  getGuildUsage,
  clearGuild
};
