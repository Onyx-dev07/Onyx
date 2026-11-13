const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const dataDir = path.join(__dirname, '..', '..', 'data');
const dbFile = path.join(dataDir, 'guilds.json');

// Ensure data folder exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// In-memory cache for ultra-fast lookups
let cache = {};

// Load existing database on boot
try {
  if (fs.existsSync(dbFile)) {
    const raw = fs.readFileSync(dbFile, 'utf8');
    cache = JSON.parse(raw || '{}');
  } else {
    fs.writeFileSync(dbFile, JSON.stringify({}, null, 2), 'utf8');
  }
} catch (err) {
  logger.error('Failed to load database file:', err);
  cache = {};
}

// Persist database with safe atomic write
function save() {
  try {
    const tempFile = `${dbFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(cache, null, 2), 'utf8');
    fs.renameSync(tempFile, dbFile);
  } catch (err) {
    logger.error('Failed to save database file:', err);
  }
}

const db = {
  getGuild(guildId) {
    if (!cache[guildId]) {
      cache[guildId] = {
        prefix: null,
        welcome: { enabled: false, channelId: null, message: null },
        autorole: { enabled: false, roleId: null, botRoleId: null },
        antiNuke: {
          enabled: false,
          punishment: 'ban',
          roles: { onyx1: null, onyx2: null, firewall: null, quarantine: null },
          whitelist: {},
          extraOwners: [],
          logChannelId: null
        },
        fortress: { enabled: false, savedPermissions: {} },
        emergency: { enabled: false },
        mediaChannels: [],
        ignoredChannels: [],
        antiRaid: { enabled: false, minAccountAgeDays: 3, massJoinLimit: 5, action: 'kick' },
        limits: {
          enabled: true,
          windowSeconds: 600,
          thresholds: {
            ban: 6,
            kick: 6,
            botadd: 2,
            chcr: 4,
            chdl: 4,
            chup: 4,
            rlcr: 4,
            rldl: 4,
            rlup: 4,
            memup: 6,
            everyone: 2,
            guildup: 2,
            intg: 2,
            webhook: 3,
            prune: 2
          }
        },
        antiBetray: {
          enabled: true,
          lockdown: true
        },
        setup: {
          accepted: false,
          acceptedAt: null,
          acceptedBy: null
        },
        autoMod: {
          antiSpam: false,
          antiCaps: false,
          antiLink: false,
          antiInvite: false,
          antiMassMention: false,
          antiEmojiSpam: false,
          antiNsfwLink: false,
          antiExternalApps: false,
          antiTokenSpam: false,
          blacklist: [],
          logChannelId: null
        },
        jail: { roleId: null, channelId: null, jailedMembers: {} },
        hardbans: [],
        modLogs: { enabled: false, channelId: null },
        warnings: {},
        afk: {},
        customRoles: { reqRoleId: null, presets: {}, commands: {} },
        autoresponders: {},
        voiceChannels: [],
        voiceConfig: { enabled: false, joinToCreateChannelId: null },
        voiceOwners: {}
      };
    }

    // Default fallbacks for schema evolution
    const g = cache[guildId];
    if (!g.antiNuke) g.antiNuke = { enabled: false, punishment: 'ban', roles: {}, whitelist: {}, extraOwners: [], logChannelId: null };
    if (!g.antiNuke.whitelist || Array.isArray(g.antiNuke.whitelist)) g.antiNuke.whitelist = {};
    if (!Array.isArray(g.antiNuke.extraOwners)) g.antiNuke.extraOwners = [];
    if (!g.antiNuke.roles) g.antiNuke.roles = {};
    if (g.antiNuke.logChannelId === undefined) g.antiNuke.logChannelId = null;
    if (g.antiNuke.roles.quarantine === undefined) g.antiNuke.roles.quarantine = null;
    // Migrate the old Nightmode schema into Fortress without losing saved permissions.
    if (!g.fortress) g.fortress = g.nightmode || { enabled: false, savedPermissions: {} };
    if (!g.fortress.savedPermissions) g.fortress.savedPermissions = {};
    if (g.nightmode) delete g.nightmode;
    if (!g.emergency) g.emergency = { enabled: false };
    if (!g.mediaChannels) g.mediaChannels = [];
    if (!g.ignoredChannels) g.ignoredChannels = [];
    if (!g.modLogs) g.modLogs = { enabled: false, channelId: null };
    if (!g.antiRaid) g.antiRaid = { enabled: false, minAccountAgeDays: 3, massJoinLimit: 5, action: 'kick' };
    if (!g.limits) {
      g.limits = {
        enabled: true,
        windowSeconds: 600,
        thresholds: {}
      };
    }
    g.limits = {
      enabled: g.limits.enabled !== false,
      windowSeconds: g.limits.windowSeconds || 600,
      thresholds: {
        ban: 6,
        kick: 6,
        botadd: 2,
        chcr: 4,
        chdl: 4,
        chup: 4,
        rlcr: 4,
        rldl: 4,
        rlup: 4,
        memup: 6,
        everyone: 2,
        guildup: 2,
        intg: 2,
        webhook: 3,
        prune: 2,
        ...g.limits.thresholds
      }
    };
    if (!g.antiBetray) g.antiBetray = { enabled: true, lockdown: true };
    g.antiBetray = {
      enabled: g.antiBetray.enabled !== false,
      lockdown: g.antiBetray.lockdown !== false
    };
    if (!g.setup) g.setup = { accepted: false, acceptedAt: null, acceptedBy: null };
    g.autoMod = {
      antiSpam: false,
      antiCaps: false,
      antiLink: false,
      antiInvite: false,
      antiMassMention: false,
      antiEmojiSpam: false,
      antiNsfwLink: false,
      antiExternalApps: false,
      antiTokenSpam: false,
      blacklist: [],
      logChannelId: null,
      ...g.autoMod
    };
    if (!Array.isArray(g.autoMod.blacklist)) g.autoMod.blacklist = [];
    if (g.autoMod.logChannelId === undefined) g.autoMod.logChannelId = null;
    if (!g.customRoles) g.customRoles = { reqRoleId: null, presets: {}, commands: {} };
    if (!g.customRoles.presets) g.customRoles.presets = {};
    if (!g.customRoles.commands) g.customRoles.commands = {};
    if (!g.autoresponders) g.autoresponders = {};
    if (!g.jail) g.jail = { roleId: null, channelId: null, jailedMembers: {} };
    if (!g.hardbans) g.hardbans = [];
    if (!g.afk) g.afk = {};
    if (!g.voiceChannels) g.voiceChannels = [];
    if (!g.voiceConfig) g.voiceConfig = { enabled: false, joinToCreateChannelId: null };
    if (g.voiceConfig.enabled === undefined) g.voiceConfig.enabled = false;
    if (g.voiceConfig.joinToCreateChannelId === undefined) g.voiceConfig.joinToCreateChannelId = null;
    if (!g.voiceOwners) g.voiceOwners = {};

    return g;
  },

  setGuild(guildId, data) {
    cache[guildId] = { ...this.getGuild(guildId), ...data };
    save();
    return cache[guildId];
  },

  getPrefix(guildId, defaultPrefix = '!') {
    return this.getGuild(guildId).prefix || defaultPrefix;
  },

  setPrefix(guildId, prefix) {
    const g = this.getGuild(guildId);
    g.prefix = prefix;
    save();
    return prefix;
  },

  // AntiNuke
  getAntiNuke(guildId) {
    return this.getGuild(guildId).antiNuke;
  },

  setAntiNuke(guildId, settings) {
    const g = this.getGuild(guildId);
    g.antiNuke = { ...g.antiNuke, ...settings };
    save();
    return g.antiNuke;
  },

  isWhitelisted(guildId, userId, action = 'all') {
    const g = this.getGuild(guildId);
    const an = g.antiNuke;
    if (!an || !an.enabled) return false;
    // Extra owners and server owner always pass
    if (an.extraOwners && an.extraOwners.includes(userId)) return true;

    const userWl = an.whitelist?.[userId];
    if (!userWl) return false;
    if (userWl.all) return true;
    return !!userWl[action];
  },

  addWhitelist(guildId, userId, permissions = { all: true }) {
    const g = this.getGuild(guildId);
    if (!g.antiNuke.whitelist) g.antiNuke.whitelist = {};
    g.antiNuke.whitelist[userId] = { ...(g.antiNuke.whitelist[userId] || {}), ...permissions };
    save();
    return g.antiNuke.whitelist;
  },

  // Replaces a user's scope, so selecting only one module removes broader access.
  setWhitelist(guildId, userId, permissions = { all: true }) {
    const g = this.getGuild(guildId);
    if (!g.antiNuke.whitelist) g.antiNuke.whitelist = {};
    g.antiNuke.whitelist[userId] = { ...permissions };
    save();
    return g.antiNuke.whitelist;
  },

  removeWhitelist(guildId, userId) {
    const g = this.getGuild(guildId);
    if (g.antiNuke.whitelist && g.antiNuke.whitelist[userId]) {
      delete g.antiNuke.whitelist[userId];
      save();
    }
    return g.antiNuke.whitelist;
  },

  getExtraOwners(guildId) {
    return this.getGuild(guildId).antiNuke.extraOwners || [];
  },

  addExtraOwner(guildId, userId) {
    const g = this.getGuild(guildId);
    if (!g.antiNuke.extraOwners) g.antiNuke.extraOwners = [];
    if (!g.antiNuke.extraOwners.includes(userId)) {
      g.antiNuke.extraOwners.push(userId);
      save();
    }
    return g.antiNuke.extraOwners;
  },

  removeExtraOwner(guildId, userId) {
    const g = this.getGuild(guildId);
    if (g.antiNuke.extraOwners) {
      g.antiNuke.extraOwners = g.antiNuke.extraOwners.filter(id => id !== userId);
      save();
    }
    return g.antiNuke.extraOwners;
  },

  // Fortress
  getFortress(guildId) {
    return this.getGuild(guildId).fortress;
  },

  setFortress(guildId, settings) {
    const g = this.getGuild(guildId);
    g.fortress = { ...g.fortress, ...settings };
    save();
    return g.fortress;
  },

  // Media Channels
  getMediaChannels(guildId) {
    return this.getGuild(guildId).mediaChannels || [];
  },

  addMediaChannel(guildId, channelId) {
    const g = this.getGuild(guildId);
    if (!g.mediaChannels.includes(channelId)) {
      g.mediaChannels.push(channelId);
      save();
    }
    return g.mediaChannels;
  },

  removeMediaChannel(guildId, channelId) {
    const g = this.getGuild(guildId);
    g.mediaChannels = g.mediaChannels.filter(id => id !== channelId);
    save();
    return g.mediaChannels;
  },

  // Welcome & Autorole
  getWelcome(guildId) {
    return this.getGuild(guildId).welcome;
  },

  setWelcome(guildId, settings) {
    const g = this.getGuild(guildId);
    g.welcome = { ...g.welcome, ...settings };
    save();
    return g.welcome;
  },

  getAutorole(guildId) {
    return this.getGuild(guildId).autorole;
  },

  setAutorole(guildId, settings) {
    const g = this.getGuild(guildId);
    g.autorole = { ...g.autorole, ...settings };
    save();
    return g.autorole;
  },

  // AntiRaid & AutoMod
  getAntiRaid(guildId) {
    return this.getGuild(guildId).antiRaid;
  },

  setAntiRaid(guildId, settings) {
    const g = this.getGuild(guildId);
    g.antiRaid = { ...g.antiRaid, ...settings };
    save();
    return g.antiRaid;
  },

  // Limit System
  getLimits(guildId) {
    return this.getGuild(guildId).limits;
  },

  setLimits(guildId, settings = {}) {
    const g = this.getGuild(guildId);
    g.limits = {
      ...g.limits,
      ...settings,
      thresholds: {
        ...g.limits.thresholds,
        ...(settings.thresholds || {})
      }
    };
    save();
    return g.limits;
  },

  setLimitThreshold(guildId, action, max) {
    const g = this.getGuild(guildId);
    g.limits.thresholds[action] = max;
    save();
    return g.limits;
  },

  resetLimits(guildId) {
    const g = this.getGuild(guildId);
    g.limits = {
      enabled: true,
      windowSeconds: 600,
      thresholds: {
        ban: 6,
        kick: 6,
        botadd: 2,
        chcr: 4,
        chdl: 4,
        chup: 4,
        rlcr: 4,
        rldl: 4,
        rlup: 4,
        memup: 6,
        everyone: 2,
        guildup: 2,
        intg: 2,
        webhook: 3,
        prune: 2
      }
    };
    save();
    return g.limits;
  },

  // Anti-Betray
  getAntiBetray(guildId) {
    return this.getGuild(guildId).antiBetray;
  },

  setAntiBetray(guildId, settings = {}) {
    const g = this.getGuild(guildId);
    g.antiBetray = { ...g.antiBetray, ...settings };
    save();
    return g.antiBetray;
  },

  // Security acceptance flow
  getSetup(guildId) {
    return this.getGuild(guildId).setup;
  },

  acceptSetup(guildId, userId) {
    const g = this.getGuild(guildId);
    g.setup = {
      accepted: true,
      acceptedAt: Date.now(),
      acceptedBy: userId
    };
    save();
    return g.setup;
  },

  resetSetup(guildId) {
    const g = this.getGuild(guildId);
    g.setup = { accepted: false, acceptedAt: null, acceptedBy: null };
    save();
    return g.setup;
  },

  getAutoMod(guildId) {
    return this.getGuild(guildId).autoMod;
  },

  setAutoMod(guildId, settings) {
    const g = this.getGuild(guildId);
    g.autoMod = { ...g.autoMod, ...settings };
    save();
    return g.autoMod;
  },

  setAntiNukeLogChannel(guildId, channelId) {
    const g = this.getGuild(guildId);
    g.antiNuke.logChannelId = channelId;
    save();
    return g.antiNuke.logChannelId;
  },

  setAutoModLogChannel(guildId, channelId) {
    const g = this.getGuild(guildId);
    g.autoMod.logChannelId = channelId;
    save();
    return g.autoMod.logChannelId;
  },

  setQuarantineRole(guildId, roleId) {
    const g = this.getGuild(guildId);
    if (!g.antiNuke.roles) g.antiNuke.roles = {};
    g.antiNuke.roles.quarantine = roleId;
    save();
    return g.antiNuke.roles.quarantine;
  },

  // Jail
  getJail(guildId) {
    return this.getGuild(guildId).jail;
  },

  setJail(guildId, settings) {
    const g = this.getGuild(guildId);
    g.jail = { ...g.jail, ...settings };
    save();
    return g.jail;
  },

  saveJailedMember(guildId, userId, originalRoles, reason) {
    const g = this.getGuild(guildId);
    if (!g.jail.jailedMembers) g.jail.jailedMembers = {};
    g.jail.jailedMembers[userId] = {
      roles: originalRoles,
      reason,
      timestamp: Date.now()
    };
    save();
    return g.jail.jailedMembers[userId];
  },

  getJailedMember(guildId, userId) {
    return this.getGuild(guildId).jail.jailedMembers?.[userId] || null;
  },

  removeJailedMember(guildId, userId) {
    const g = this.getGuild(guildId);
    if (g.jail.jailedMembers && g.jail.jailedMembers[userId]) {
      const data = g.jail.jailedMembers[userId];
      delete g.jail.jailedMembers[userId];
      save();
      return data;
    }
    return null;
  },

  // Hardban
  getHardbans(guildId) {
    return this.getGuild(guildId).hardbans || [];
  },

  addHardban(guildId, userId) {
    const g = this.getGuild(guildId);
    if (!g.hardbans.includes(userId)) {
      g.hardbans.push(userId);
      save();
    }
    return g.hardbans;
  },

  removeHardban(guildId, userId) {
    const g = this.getGuild(guildId);
    g.hardbans = g.hardbans.filter(id => id !== userId);
    save();
    return g.hardbans;
  },

  // ModLogs
  getModLogs(guildId) {
    return this.getGuild(guildId).modLogs;
  },

  setModLogs(guildId, channelId, enabled = true) {
    const g = this.getGuild(guildId);
    g.modLogs = { channelId, enabled };
    save();
    return g.modLogs;
  },

  // Warnings
  addWarning(guildId, userId, warning) {
    const g = this.getGuild(guildId);
    if (!g.warnings) g.warnings = {};
    if (!g.warnings[userId]) g.warnings[userId] = [];
    g.warnings[userId].push(warning);
    save();
    return g.warnings[userId];
  },

  getWarnings(guildId, userId) {
    const g = this.getGuild(guildId);
    return g.warnings?.[userId] || [];
  },

  clearWarnings(guildId, userId) {
    const g = this.getGuild(guildId);
    if (g.warnings && g.warnings[userId]) {
      g.warnings[userId] = [];
      save();
    }
    return [];
  },

  // AFK
  setAfk(guildId, userId, reason) {
    const g = this.getGuild(guildId);
    if (!g.afk) g.afk = {};
    g.afk[userId] = { reason, timestamp: Date.now() };
    save();
  },

  getAfk(guildId, userId) {
    return this.getGuild(guildId).afk?.[userId] || null;
  },

  removeAfk(guildId, userId) {
    const g = this.getGuild(guildId);
    if (g.afk && g.afk[userId]) {
      const val = g.afk[userId];
      delete g.afk[userId];
      save();
      return val;
    }
    return null;
  },

  // Custom Roles
  getCustomRoles(guildId) {
    return this.getGuild(guildId).customRoles;
  },

  setPresetRole(guildId, preset, roleId) {
    const g = this.getGuild(guildId);
    if (!g.customRoles.presets) g.customRoles.presets = {};
    g.customRoles.presets[preset] = roleId;
    save();
    return g.customRoles.presets;
  },

  setReqRole(guildId, roleId) {
    const g = this.getGuild(guildId);
    g.customRoles.reqRoleId = roleId;
    save();
    return roleId;
  },

  setCustomRole(guildId, name, roleId) {
    const g = this.getGuild(guildId);
    if (!g.customRoles.commands) g.customRoles.commands = {};
    g.customRoles.commands[name.toLowerCase()] = roleId;
    save();
    return g.customRoles.commands;
  },

  removeCustomRole(guildId, name) {
    const g = this.getGuild(guildId);
    if (g.customRoles.commands) {
      delete g.customRoles.commands[name.toLowerCase()];
      save();
    }
    return g.customRoles.commands;
  },

  resetCustomRoles(guildId) {
    const g = this.getGuild(guildId);
    g.customRoles = { reqRoleId: null, presets: {}, commands: {} };
    save();
    return g.customRoles;
  },

  // Autoresponders
  getAutoresponders(guildId) {
    return this.getGuild(guildId).autoresponders || {};
  },

  setAutoresponder(guildId, trigger, response) {
    const g = this.getGuild(guildId);
    if (!g.autoresponders) g.autoresponders = {};
    g.autoresponders[trigger.toLowerCase()] = response;
    save();
    return g.autoresponders;
  },

  removeAutoresponder(guildId, trigger) {
    const g = this.getGuild(guildId);
    if (g.autoresponders && g.autoresponders[trigger.toLowerCase()]) {
      delete g.autoresponders[trigger.toLowerCase()];
      save();
    }
    return g.autoresponders;
  },

  // Voice channels
  getVoiceChannels(guildId) {
    return this.getGuild(guildId).voiceChannels || [];
  },

  addVoiceChannel(guildId, channelId) {
    const g = this.getGuild(guildId);
    if (!g.voiceChannels.includes(channelId)) {
      g.voiceChannels.push(channelId);
      save();
    }
    return g.voiceChannels;
  },

  removeVoiceChannel(guildId, channelId) {
    const g = this.getGuild(guildId);
    g.voiceChannels = g.voiceChannels.filter(id => id !== channelId);
    save();
    return g.voiceChannels;
  },

  // Voice Config (Join-to-Create)
  getVoiceConfig(guildId) {
    return this.getGuild(guildId).voiceConfig;
  },

  setVoiceConfig(guildId, settings) {
    const g = this.getGuild(guildId);
    g.voiceConfig = { ...g.voiceConfig, ...settings };
    save();
    return g.voiceConfig;
  },

  // Voice Owners (temp channel ID -> owner user ID)
  getVoiceOwners(guildId) {
    return this.getGuild(guildId).voiceOwners || {};
  },

  getVoiceOwner(guildId, channelId) {
    return this.getGuild(guildId).voiceOwners?.[channelId] || null;
  },

  setVoiceOwner(guildId, channelId, userId) {
    const g = this.getGuild(guildId);
    if (!g.voiceOwners) g.voiceOwners = {};
    g.voiceOwners[channelId] = userId;
    save();
    return g.voiceOwners;
  },

  removeVoiceOwner(guildId, channelId) {
    const g = this.getGuild(guildId);
    if (g.voiceOwners && g.voiceOwners[channelId]) {
      delete g.voiceOwners[channelId];
      save();
    }
    return g.voiceOwners;
  }
};

module.exports = db;
