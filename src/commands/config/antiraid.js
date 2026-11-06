const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const db = require('../../database');
const config = require('../../../config.json');
const { securityEmbed, errorEmbed, stateLine, code, UI, mark } = require('../../utils/embeds');

function canManage(interaction) {
  return interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);
}

function panelEmbed(guild) {
  const current = db.getAntiRaid(guild.id);
  const enabled = Boolean(current.enabled);

  return securityEmbed({
    title: 'Anti-Raid',
    description: [
      `${mark(enabled)} **Protection** ${UI.separator} ${enabled ? 'Armed' : 'Standby'}`,
      '',
      muted('Join surges and newly created accounts are intercepted before they can act.')
    ].join('\n'),
    fields: [
      { name: 'Min. account age', value: `${current.minAccountAgeDays || 0} days`, inline: true },
      { name: 'Join threshold', value: `${current.massJoinLimit || 5} / 10s`, inline: true },
      { name: 'Action', value: (current.action || 'kick').toUpperCase(), inline: true }
    ],
    color: enabled ? config.colors.crimson : config.colors.info,
    footer: { text: `Anti-Raid ${UI.separator} ${enabled ? 'Armed' : 'Standby'}` }
  });
}

function controlRow(guild) {
  const current = db.getAntiRaid(guild.id);

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('antiraid_toggle')
      .setLabel(current.enabled ? 'Disable' : 'Enable')
      .setStyle(current.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('antiraid_action')
      .setLabel('Change action')
      .setStyle(ButtonStyle.Secondary)
  );
}

function panelPayload(guild) {
  return {
    embeds: [panelEmbed(guild)],
    components: [controlRow(guild)]
  };
}

const builder = new SlashCommandBuilder()
  .setName('antiraid')
  .setDescription('Configures Anti-Raid protection.')
  .addSubcommand(sub =>
    sub.setName('enable')
      .setDescription('Enables the Anti-Raid system')
  )
  .addSubcommand(sub =>
    sub.setName('disable')
      .setDescription('Disables the Anti-Raid system')
  )
  .addSubcommand(sub =>
    sub.setName('accountage')
      .setDescription('Set minimum required account age in days to prevent alt raids')
      .addIntegerOption(opt =>
        opt.setName('days')
          .setDescription('Minimum age in days (0 to disable age check)')
          .setMinValue(0)
          .setMaxValue(30)
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('action')
      .setDescription('Defensive action when a raid is detected')
      .addStringOption(opt =>
        opt.setName('type')
          .setDescription('Action type')
          .addChoices(
            { name: 'Kick offender', value: 'kick' },
            { name: 'Ban offender', value: 'ban' }
          )
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('status')
      .setDescription('View current Anti-Raid configuration')
  );

module.exports = {
  name: 'antiraid',
  aliases: ['raid'],
  description: 'Configures Anti-Raid protection (mass join limits, new account age gates).',
  userPermissions: [PermissionFlagsBits.Administrator],
  data: builder,

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === 'enable' || sub === 'disable') {
      db.setAntiRaid(guild.id, { enabled: sub === 'enable' });
    } else if (sub === 'accountage') {
      db.setAntiRaid(guild.id, { minAccountAgeDays: interaction.options.getInteger('days') });
    } else if (sub === 'action') {
      db.setAntiRaid(guild.id, { action: interaction.options.getString('type') });
    }

    return interaction.reply({
      ...panelPayload(guild),
      flags: MessageFlags.Ephemeral
    });
  },

  async executePrefix(message, args) {
    const sub = args[0]?.toLowerCase();
    const guild = message.guild;

    if (sub === 'enable' || sub === 'on') {
      db.setAntiRaid(guild.id, { enabled: true });
    } else if (sub === 'disable' || sub === 'off') {
      db.setAntiRaid(guild.id, { enabled: false });
    } else if ((sub === 'age' || sub === 'accountage') && args[1] !== undefined) {
      const days = parseInt(args[1]);
      if (isNaN(days) || days < 0 || days > 30) {
        return message.reply({
          embeds: [errorEmbed(`Provide days between 0 and 30. Usage: ${code('!antiraid age 3')}`)]
        });
      }
      db.setAntiRaid(guild.id, { minAccountAgeDays: days });
    } else if (sub === 'action' && args[1]) {
      const action = args[1].toLowerCase();
      if (!['kick', 'ban'].includes(action)) {
        return message.reply({
          embeds: [errorEmbed(`Choose ${code('kick')} or ${code('ban')}.`)]
        });
      }
      db.setAntiRaid(guild.id, { action });
    }

    return message.reply(panelPayload(guild));
  },

  async handleButton(interaction) {
    if (!canManage(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('You need Administrator to change Anti-Raid.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.customId === 'antiraid_toggle') {
      const current = db.getAntiRaid(interaction.guild.id);
      db.setAntiRaid(interaction.guild.id, { enabled: !current.enabled });
      return interaction.update(panelPayload(interaction.guild));
    }

    if (interaction.customId === 'antiraid_action') {
      const options = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('antiraid_action_select')
          .setPlaceholder('Choose the defensive action')
          .addOptions(
            { label: 'Kick offender', value: 'kick' },
            { label: 'Ban offender', value: 'ban' }
          )
      );

      return interaction.reply({
        embeds: [securityEmbed({
          title: 'Anti-Raid action',
          description: 'Choose what Onyx does when a join surge or alt account is detected.'
        })],
        components: [options],
        flags: MessageFlags.Ephemeral
      });
    }

    return false;
  },

  async handleSelect(interaction) {
    if (!canManage(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('You need Administrator to change Anti-Raid.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.customId !== 'antiraid_action_select') return false;

    db.setAntiRaid(interaction.guild.id, { action: interaction.values[0] });
    return interaction.update(panelPayload(interaction.guild));
  }
};
