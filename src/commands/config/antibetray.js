const {
  SlashCommandBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const db = require('../../database');
const config = require('../../../config.json');
const antiBetray = require('../../utils/antiBetray');
const limitSystem = require('../../utils/limitSystem');
const { securityEmbed, errorEmbed, bullets, code, UI } = require('../../utils/embeds');

function isAuthorized(guild, userId) {
  return userId === guild.ownerId || db.getExtraOwners(guild.id).includes(userId);
}

function controlRow(settings) {
  const toggle = settings.enabled
    ? new ButtonBuilder()
      .setCustomId('antibetray_disable')
      .setLabel('Disable')
      .setStyle(ButtonStyle.Danger)
    : new ButtonBuilder()
      .setCustomId('antibetray_enable')
      .setLabel('Enable')
      .setStyle(ButtonStyle.Success);

  return new ActionRowBuilder().addComponents(
    toggle,
    new ButtonBuilder()
      .setCustomId('antibetray_lockdown')
      .setLabel(settings.lockdown ? 'Disable lockdown' : 'Enable lockdown')
      .setStyle(ButtonStyle.Secondary)
  );
}

function dashboardPayload(guild) {
  const settings = db.getAntiBetray(guild.id);
  const triggers = [...antiBetray.HIGH_RISK_ACTIONS].map(action =>
    `**${limitSystem.label(action)}**`
  );

  const embed = securityEmbed({
    title: 'Anti-Betray',
    description: [
      '**No trusted entity is above the rules.**',
      'Anti-Betray overrides the whitelist when a trusted user or bot exceeds a limit or attempts mass destruction.',
      '',
      `**Status** ${UI.separator} ${settings.enabled ? 'Enabled' : 'Disabled'}`,
      `**Server lockdown** ${UI.separator} ${settings.lockdown ? 'Armed' : 'Off'}`,
      `**Whitelist override** ${UI.separator} ${settings.enabled ? 'Active on breach' : 'Standby'}`
    ].join('\n'),
    fields: [
      { name: 'Trigger events', value: bullets(triggers), inline: false },
      {
        name: 'Emergency response',
        value: bullets([
          'Dangerous roles stripped from the offender',
          '24 hour timeout applied where possible',
          'Server channels locked down',
          'Emergency alert sent to the log channel'
        ]),
        inline: false
      }
    ],
    color: settings.enabled ? config.colors.crimson : config.colors.info,
    footer: { text: `Anti-Betray ${UI.separator} ${settings.enabled ? 'Armed' : 'Standby'}` }
  });

  return { embeds: [embed], components: [controlRow(settings)] };
}

module.exports = {
  name: 'antibetray',
  aliases: ['anti-betray', 'betray'],
  description: 'Configures Anti-Betray, which overrides the whitelist when trusted entities go rogue.',
  data: new SlashCommandBuilder()
    .setName('antibetray')
    .setDescription('Configures Anti-Betray protection for trusted entities that go rogue.')
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('View Anti-Betray status and triggers')
    )
    .addSubcommand(sub =>
      sub.setName('enable')
        .setDescription('Enable Anti-Betray protection')
    )
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Disable Anti-Betray protection')
    )
    .addSubcommand(sub =>
      sub.setName('lockdown')
        .setDescription('Toggle automatic server lockdown on Anti-Betray activation')
    ),

  async executeSlash(interaction) {
    if (!isAuthorized(interaction.guild, interaction.user.id)) {
      return interaction.reply({
        embeds: [errorEmbed('Only the **Server Owner** or an **Extra Owner** can manage Anti-Betray.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'enable' || sub === 'disable') {
      db.setAntiBetray(interaction.guild.id, { enabled: sub === 'enable' });
    } else if (sub === 'lockdown') {
      const settings = db.getAntiBetray(interaction.guild.id);
      db.setAntiBetray(interaction.guild.id, { lockdown: !settings.lockdown });
    }

    return interaction.reply(dashboardPayload(interaction.guild));
  },

  async executePrefix(message, args) {
    if (!isAuthorized(message.guild, message.author.id)) {
      return message.reply({
        embeds: [errorEmbed('Only the **Server Owner** or an **Extra Owner** can manage Anti-Betray.')]
      });
    }

    const option = args[0]?.toLowerCase();

    if (option === 'enable' || option === 'disable') {
      db.setAntiBetray(message.guild.id, { enabled: option === 'enable' });
    } else if (option === 'lockdown') {
      const settings = db.getAntiBetray(message.guild.id);
      db.setAntiBetray(message.guild.id, { lockdown: !settings.lockdown });
    } else if (option && option !== 'status') {
      return message.reply({
        embeds: [errorEmbed(`Unknown option. Use ${code('status')}, ${code('enable')}, ${code('disable')}, or ${code('lockdown')}.`)]
      });
    }

    return message.reply(dashboardPayload(message.guild));
  },

  async handleButton(interaction) {
    if (!isAuthorized(interaction.guild, interaction.user.id)) {
      return interaction.reply({
        embeds: [errorEmbed('Only the **Server Owner** or an **Extra Owner** can manage Anti-Betray.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.customId === 'antibetray_enable' || interaction.customId === 'antibetray_disable') {
      db.setAntiBetray(interaction.guild.id, { enabled: interaction.customId === 'antibetray_enable' });
    } else if (interaction.customId === 'antibetray_lockdown') {
      const settings = db.getAntiBetray(interaction.guild.id);
      db.setAntiBetray(interaction.guild.id, { lockdown: !settings.lockdown });
    } else {
      return false;
    }

    return interaction.update(dashboardPayload(interaction.guild));
  }
};
