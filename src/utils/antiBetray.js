const db = require('../database');
const logger = require('./logger');
const { lockServer } = require('./serverLock');

// Destructive events that escalate a Limit System breach into Anti-Betray.
const HIGH_RISK_ACTIONS = new Set([
  'ban',
  'kick',
  'botadd',
  'chdl',
  'chup',
  'rldl',
  'rlup',
  'webhook',
  'prune'
]);

const LOCKDOWN_COOLDOWN_MS = 60 * 1000;
const lockdownCooldowns = new Map();

/**
 * Evaluates a limit breach from a trusted entity.
 *
 * Anti-Betray only activates for whitelisted/extra-owner offenders performing
 * high-risk destructive actions. It overrides the whitelist, locks the server
 * (when enabled), and reports the containment summary for the emergency alert.
 */
async function evaluate(guild, userId, action) {
  const settings = db.getAntiBetray(guild.id);
  if (!settings || !settings.enabled) return { triggered: false };
  if (!HIGH_RISK_ACTIONS.has(action)) return { triggered: false };
  if (!db.isWhitelisted(guild.id, userId, action)) return { triggered: false };

  let lockdown = false;
  let lockedChannels = 0;

  if (settings.lockdown) {
    const lastLockdown = lockdownCooldowns.get(guild.id) || 0;
    if (Date.now() - lastLockdown > LOCKDOWN_COOLDOWN_MS) {
      lockdownCooldowns.set(guild.id, Date.now());
      const result = await lockServer(guild).catch(err => {
        logger.error('[AntiBetray] Failed to lock down server:', err.message);
        return { count: 0 };
      });
      lockedChannels = result.count;
      lockdown = true;
    }
  }

  logger.warn(
    `[AntiBetray] Whitelist override for ${userId} in ${guild.name} after ${action} limit breach ` +
    `(lockdown: ${lockdown}, channels: ${lockedChannels})`
  );

  return {
    triggered: true,
    lockdown,
    lockedChannels,
    highRisk: HIGH_RISK_ACTIONS
  };
}

module.exports = { HIGH_RISK_ACTIONS, evaluate };
