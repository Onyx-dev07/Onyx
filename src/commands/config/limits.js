const {
  SlashCommandBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const db = require('../../database');
const config = require('../../../config.json');
const limitSystem = require('../../utils/limitSystem');
const { securityEmbed, errorEmbed, bullets, code, UI } = require('../../utils/embeds');

function isAuthorized(guild, userId) {
  return userId === guild.ownerId || db.getExtraOwners(guild.id).includes(userId);
}

function formatWindow(seconds) {
  if (seconds % 3600 === 0) return `${seconds / 3600} hour${seconds === 3600 ? '' : 's'}`;
  if (seconds % 60 === 0) return `${seconds / 60} minute${seconds === 60 ? '' : 's'}`;
  return `${seconds} seconds`;
}

function shortWindow(seconds) {
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

function resolveAction(input) {
  if (!input) return null;
  const value = input.toLowerCase();
  if (limitSystem.ACTION_LABELS[value]) return value;

  const match = Object.entries(limitSystem.ACTION_LABELS).find(([, label]) =>
    label.toLowerCase() === value ||
    label.toLowerCase().replace(/^anti\s+/, '') === value
  );

  return match ? match[0] : null;
}

function controlRow(settings) {
  const toggle = settings.enabled
    ? new ButtonBuilder()
      .setCustomId('limits_disable')
      .setLabel('Disable')
      .setStyle(ButtonStyle.Danger)
    : new ButtonBuilder()
      .setCustomId('limits_enable')
      .setLabel('Enable')
      .setStyle(ButtonStyle.Success);

  return new ActionRowBuilder().addComponents(
    toggle,
    new ButtonBuilder()
      .setCustomId('limits_reset')
      .setLabel('Reset defaults')
      .setStyle(ButtonStyle.Secondary)
  );
}

function dashboardPayload(guild) {
  const settings = db.getLimits(guild.id);
  const usage = limitSystem.getGuildUsage(guild.id);
  const trackedUsers = new Set(usage.map(entry => entry.userId)).size;
  const window = formatWindow(settings.windowSeconds);
  const compactWindow = shortWindow(settings.windowSeconds);

  const thresholdLines = Object.entries(limitSystem.ACTION_LABELS).map(([action, label]) =>
    `**${label}:** ${code(settings.thresholds[action] ?? 0)} / ${compactWindow}`
  );

  const usageLines = usage.slice(0, 8).map(entry =>
    `<@${entry.userId}> ${limitSystem.label(entry.action)}: ${code(entry.count)} hit(s)`
  );

  const embed = securityEmbed({
    title: 'Limit system',
    description: [
      '**Threshold guardrails for trusted staff.**',
      'Whitelisted entities are trusted until they exceed a limit. On breach, Onyx strips dangerous roles, quarantines the offender, and alerts the log channel.',
      '',
      `**Status** ${UI.separator} ${settings.enabled ? 'Enabled' : 'Disabled'}`,
      `**Window** ${UI.separator} ${window}`,
      `**Tracked users** ${UI.separator} ${code(trackedUsers)}`
    ].join('\n'),
    fields: [
      { name: 'Thresholds', value: bullets(thresholdLines), inline: false },
      {
        name: 'Live usage',
        value: usageLines.length
          ? bullets(usageLines)
          : 'No tracked activity in the current window.',
        inline: false
      }
    ],
    color: settings.enabled ? config.colors.crimson : config.colors.info,
    footer: { text: `Limits ${UI.separator} ${settings.enabled ? 'Armed' : 'Standby'}` }
  });

  return { embeds: [embed], components: [controlRow(settings)] };
}

function usageEmbed(prefix) {
  return securityEmbed({
    title: 'Limit system usage',
    description: bullets([
      `${code(`${prefix}limits`)} — view thresholds and live usage`,
      `${code(`${prefix}limits enable`)} — enable limit enforcement`,
      `${code(`${prefix}limits disable`)} — disable limit enforcement`,
      `${code(`${prefix}limits set <action> <max>`)} — set a threshold`,
      `${code(`${prefix}limits window <seconds>`)} — set the tracking window`,
      `${code(`${prefix}limits reset`)} — restore defaults`
    ])
  });
}

const actionChoices = Object.entries(limitSystem.ACTION_LABELS).map(([value, name]) => ({
  name,
  value
}));

module.exports = {
  name: 'limits',
  aliases: ['limit', 'thresholds'],
  description: 'Configures the Limit System thresholds that guard trusted staff actions.',
  data: new SlashCommandBuilder()
    .setName('limits')
    .setDescription('Configures the Limit System thresholds that guard trusted staff actions.')
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('View thresholds and live usage')
    )
    .addSubcommand(sub =>
      sub.setName('enable')
        .setDescription('Enable limit enforcement')
    )
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Disable limit enforcement')
    )
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set the maximum actions allowed per window')
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Protected security event')
            .setRequired(true)
            .addChoices(...actionChoices)
        )
        .addIntegerOption(option =>
          option.setName('max')
            .setDescription('Maximum allowed actions inside the window')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        )
    )
    .addSubcommand(sub =>
      sub.setName('window')
        .setDescription('Set the tracking window in seconds')
        .addIntegerOption(option =>
          option.setName('seconds')
            .setDescription('Window length in seconds (10-86400)')
            .setRequired(true)
            .setMinValue(10)
            .setMaxValue(86400)
        )
    )
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Restore the default thresholds')
    ),

  async executeSlash(interaction) {
    if (!isAuthorized(interaction.guild, interaction.user.id)) {
      return interaction.reply({
        embeds: [errorEmbed('Only the **Server Owner** or an **Extra Owner** can manage the Limit System.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'enable' || sub === 'disable') {
      db.setLimits(interaction.guild.id, { enabled: sub === 'enable' });
    } else if (sub === 'set') {
      const action = interaction.options.getString('action');
      const max = interaction.options.getInteger('max');
      db.setLimitThreshold(interaction.guild.id, action, max);
    } else if (sub === 'window') {
      const seconds = interaction.options.getInteger('seconds');
      db.setLimits(interaction.guild.id, { windowSeconds: seconds });
    } else if (sub === 'reset') {
      db.resetLimits(interaction.guild.id);
      limitSystem.clearGuild(interaction.guild.id);
    }

    return interaction.reply(dashboardPayload(interaction.guild));
  },

  async executePrefix(message, args) {
    if (!isAuthorized(message.guild, message.author.id)) {
      return message.reply({
        embeds: [errorEmbed('Only the **Server Owner** or an **Extra Owner** can manage the Limit System.')]
      });
    }

    const prefix = db.getPrefix(message.guild.id, process.env.DEFAULT_PREFIX || config.defaultPrefix || '!');
    const option = args[0]?.toLowerCase();

    if (!option || option === 'status' || option === 'panel') {
      return message.reply(dashboardPayload(message.guild));
    }

    if (option === 'enable' || option === 'disable') {
      db.setLimits(message.guild.id, { enabled: option === 'enable' });
    } else if (option === 'set') {
      const action = resolveAction(args[1]);
      const max = Number(args[2]);

      if (!action) {
        return message.reply({
          embeds: [errorEmbed(`Unknown action. Available actions: ${Object.keys(limitSystem.ACTION_LABELS).map(code).join(', ')}`)]
        });
      }

      if (!Number.isInteger(max) || max < 1 || max > 100) {
        return message.reply({
          embeds: [errorEmbed(`Please provide a maximum between 1 and 100. Usage: ${code(`${prefix}limits set ${action} 6`)}`)]
        });
      }

      db.setLimitThreshold(message.guild.id, action, max);
    } else if (option === 'window') {
      const seconds = Number(args[1]);

      if (!Number.isInteger(seconds) || seconds < 10 || seconds > 86400) {
        return message.reply({
          embeds: [errorEmbed(`Please provide a window between 10 and 86400 seconds. Usage: ${code(`${prefix}limits window 600`)}`)]
        });
      }

      db.setLimits(message.guild.id, { windowSeconds: seconds });
    } else if (option === 'reset') {
      db.resetLimits(message.guild.id);
      limitSystem.clearGuild(message.guild.id);
    } else {
      return message.reply({ embeds: [usageEmbed(prefix)] });
    }

    return message.reply(dashboardPayload(message.guild));
  },

  async handleButton(interaction) {
    if (!isAuthorized(interaction.guild, interaction.user.id)) {
      return interaction.reply({
        embeds: [errorEmbed('Only the **Server Owner** or an **Extra Owner** can manage the Limit System.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.customId === 'limits_enable' || interaction.customId === 'limits_disable') {
      db.setLimits(interaction.guild.id, { enabled: interaction.customId === 'limits_enable' });
    } else if (interaction.customId === 'limits_reset') {
      db.resetLimits(interaction.guild.id);
      limitSystem.clearGuild(interaction.guild.id);
    } else {
      return false;
    }

    return interaction.update(dashboardPayload(interaction.guild));
  }
};
