const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const db = require('../../database');
const config = require('../../../config.json');
const { createEmbed, errorEmbed, stateLine, UI } = require('../../utils/embeds');

function canManage(interaction) {
  return interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
}

function panelEmbed(guild) {
  const current = db.getModLogs(guild.id);
  const active = Boolean(current.enabled && current.channelId);

  return createEmbed({
    title: 'Logging',
    description: [
      stateLine(active, active ? 'Moderation events are being recorded' : 'No log channel configured'),
      '',
      'Moderation actions, security alerts, and member events are delivered to one channel.'
    ].join('\n'),
    fields: [
      { name: 'Status', value: active ? 'Active' : 'Inactive', inline: true },
      { name: 'Channel', value: current.channelId ? `<#${current.channelId}>` : 'None', inline: true }
    ],
    color: active ? config.colors.success : config.colors.primary,
    footer: { text: `Logging ${UI.separator} ${active ? 'Active' : 'Inactive'}` }
  });
}

function panelPayload(guild) {
  const current = db.getModLogs(guild.id);

  return {
    embeds: [panelEmbed(guild)],
    components: [
      new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId('logs_channel')
          .setPlaceholder('Select the moderation log channel')
          .addChannelTypes(ChannelType.GuildText)
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('logs_disable')
          .setLabel('Disable logging')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!current.enabled)
      )
    ]
  };
}

module.exports = {
  name: 'logs',
  aliases: ['modlogs', 'setlogs'],
  description: 'Configures the channel where moderation and security logs are posted.',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Configures the channel where moderation and security logs are posted.')
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Sets the moderation logs channel')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Log channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Disables moderation logs')
    ),

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const channel = interaction.options.getChannel('channel');
      db.setModLogs(interaction.guild.id, channel.id, true);
    } else {
      db.setModLogs(interaction.guild.id, null, false);
    }

    return interaction.reply({
      ...panelPayload(interaction.guild),
      flags: MessageFlags.Ephemeral
    });
  },

  async executePrefix(message, args) {
    if (args[0]?.toLowerCase() === 'disable') {
      db.setModLogs(message.guild.id, null, false);
      return message.reply(panelPayload(message.guild));
    }

    const channel = message.mentions.channels.first();
    if (channel) {
      db.setModLogs(message.guild.id, channel.id, true);
    }

    return message.reply(panelPayload(message.guild));
  },

  async handleSelect(interaction) {
    if (!canManage(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('You need Manage Server to change logging.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.customId !== 'logs_channel') return false;

    db.setModLogs(interaction.guild.id, interaction.values[0], true);
    return interaction.update(panelPayload(interaction.guild));
  },

  async handleButton(interaction) {
    if (!canManage(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('You need Manage Server to change logging.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.customId !== 'logs_disable') return false;

    db.setModLogs(interaction.guild.id, null, false);
    return interaction.update(panelPayload(interaction.guild));
  }
};
