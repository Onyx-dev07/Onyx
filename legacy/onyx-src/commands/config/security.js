const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  GuildMFALevel,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const db = require('../../database');
const config = require('../../../config.json');
const { securityEmbed, errorEmbed, brand, bullets, UI, scoreBand } = require('../../utils/embeds');

const AUTOMOD_KEYS = [
  { key: 'antiSpam', label: 'spam' },
  { key: 'antiCaps', label: 'caps' },
  { key: 'antiLink', label: 'links' },
  { key: 'antiInvite', label: 'invites' },
  { key: 'antiMassMention', label: 'mass mentions' },
  { key: 'antiEmojiSpam', label: 'emoji spam' },
  { key: 'antiNsfwLink', label: 'NSFW links' },
  { key: 'antiExternalApps', label: 'external apps' },
  { key: 'antiTokenSpam', label: 'token spam' }
];

function evaluate(guild) {
  const antiNuke = db.getAntiNuke(guild.id);
  const antiRaid = db.getAntiRaid(guild.id);
  const autoMod = db.getAutoMod(guild.id);
  const logs = db.getModLogs(guild.id);
  const jail = db.getJail(guild.id);

  const adminRoles = guild.roles.cache.filter(role =>
    role.id !== guild.id &&
    !role.managed &&
    role.permissions.has(PermissionFlagsBits.Administrator)
  );

  const missingFilters = AUTOMOD_KEYS.filter(filter => !autoMod[filter.key]);
  const activeFilters = AUTOMOD_KEYS.length - missingFilters.length;
  const autoModScore = Math.round((activeFilters / AUTOMOD_KEYS.length) * 25);

  const firewallReady = Boolean(antiNuke.roles?.firewall);
  const antiNukeScore = (antiNuke.enabled ? 20 : 0) + (firewallReady ? 5 : 0);
  const antiRaidScore = antiRaid.enabled ? 15 : 0;
  const logsScore = logs.enabled && logs.channelId ? 10 : 0;
  const jailScore = jail.roleId && jail.channelId ? 5 : 0;
  const mfaScore = guild.mfaLevel === GuildMFALevel.Elevated ? 5 : 0;

  const highestDangerous = adminRoles.size
    ? Math.max(...adminRoles.map(role => role.position))
    : 0;
  const botPosition = guild.members.me?.roles.highest.position ?? 0;
  const hierarchyScore = adminRoles.size === 0 || botPosition > highestDangerous ? 5 : 0;

  const exposureScore = adminRoles.size <= 2
    ? 10
    : adminRoles.size <= 5
      ? 5
      : adminRoles.size <= 9
        ? 2
        : 0;

  const categories = [
    { label: 'AntiNuke', score: antiNukeScore, max: 25 },
    { label: 'AntiRaid', score: antiRaidScore, max: 15 },
    { label: 'AutoMod', score: autoModScore, max: 25 },
    { label: 'Logs', score: logsScore, max: 10 },
    { label: 'Jail', score: jailScore, max: 5 },
    { label: 'MFA', score: mfaScore, max: 5 },
    { label: 'Hierarchy', score: hierarchyScore, max: 5 },
    { label: 'Exposure', score: exposureScore, max: 10 }
  ];

  const score = categories.reduce((total, category) => total + category.score, 0);
  const recommendations = [];

  if (!antiNuke.enabled) {
    recommendations.push('Activate the firewall with `/antinuke enable`.');
  } else if (!firewallReady) {
    recommendations.push('Rebuild the Onyx security roles with `/antinuke enable`.');
  }

  if (!antiRaid.enabled) {
    recommendations.push('Guard join surges with `/antiraid enable`.');
  }

  if (missingFilters.length) {
    recommendations.push(`Cover ${missingFilters.map(filter => filter.label).join(', ')} with \`/automod enable\`.`);
  }

  if (!logsScore) {
    recommendations.push('Route moderation events with `/logs set #channel`.');
  }

  if (!jailScore) {
    recommendations.push('Create the jail role and channel with `/setup`.');
  }

  if (!mfaScore) {
    recommendations.push('Require 2FA for moderators in **Server Settings > Safety Setup**.');
  }

  if (!hierarchyScore) {
    recommendations.push('Move the Onyx role above every role holding **Administrator**.');
  }

  if (adminRoles.size > 2) {
    recommendations.push(`Review ${adminRoles.size} roles holding **Administrator** and trim access.`);
  }

  return { score, categories, recommendations };
}

function markerFor(category) {
  if (category.score >= category.max) return UI.active;
  if (category.score > 0) return UI.partial;
  return UI.inactive;
}

function dashboardEmbed(guild) {
  const result = evaluate(guild);
  const limits = db.getLimits(guild.id);
  const betray = db.getAntiBetray(guild.id);
  const band = scoreBand(result.score);
  const categoryLines = result.categories.map(category =>
    `${markerFor(category)} ${category.label} ${category.score}/${category.max}`
  );
  const half = Math.ceil(categoryLines.length / 2);
  const next = result.recommendations[0] || `${UI.active} All checks passed.`;

  return securityEmbed({
    title: 'Security overview',
    description: [
      brand(`${guild.name} ${UI.separator} ${result.score}/100 ${UI.separator} ${band.label}`),
      '',
      bullets(categoryLines)
    ].join('\n'),
    fields: [
      { name: 'Next action', value: next, inline: false },
      {
        name: 'Limit system',
        value: limits.enabled ? `Armed · ${Object.keys(limits.thresholds).length} thresholds` : 'Disabled',
        inline: true
      },
      {
        name: 'Anti-Betray',
        value: betray.enabled ? 'Armed · whitelist override' : 'Disabled',
        inline: true
      }
    ],
    color: config.colors.crimson,
    footer: { text: `Security ${UI.separator} ${band.label}` }
  });
}

function dashboardPayload(guild) {
  return {
    embeds: [dashboardEmbed(guild)],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('security_refresh')
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Secondary)
    )]
  };
}

module.exports = {
  name: 'security',
  aliases: ['sec', 'audit'],
  description: 'Audits the server security posture and returns a compact health score.',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('security')
    .setDescription('Audits the server security posture and returns a compact health score.'),

  async executeSlash(interaction) {
    return interaction.reply(dashboardPayload(interaction.guild));
  },

  async executePrefix(message) {
    return message.reply(dashboardPayload(message.guild));
  },

  async handleButton(interaction) {
    if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        embeds: [errorEmbed('You need Manage Server to refresh the security dashboard.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.customId !== 'security_refresh') return false;
    return interaction.update(dashboardPayload(interaction.guild));
  }
};
