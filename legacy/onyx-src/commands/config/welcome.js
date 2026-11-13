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
const { createEmbed, errorEmbed, stateLine, code, UI } = require('../../utils/embeds');

const DEFAULT_MESSAGE = 'Welcome to {server}, {user}! We now have {memberCount} members.';

function canManage(interaction) {
  return interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
}

function panelEmbed(guild) {
  const current = db.getWelcome(guild.id);
  const active = Boolean(current.enabled && current.channelId);

  return createEmbed({
    title: 'Welcome',
    description: [
      stateLine(active, active ? 'Welcome messages are enabled' : 'Welcome messages are disabled'),
      '',
      'New members receive a welcome card in the configured channel.'
    ].join('\n'),
    fields: [
      { name: 'Channel', value: current.channelId ? `<#${current.channelId}>` : 'None', inline: true },
      { name: 'Template', value: String(current.message || DEFAULT_MESSAGE).slice(0, 1020), inline: false }
    ],
    color: active ? config.colors.success : config.colors.primary,
    footer: { text: `Welcome ${UI.separator} ${active ? 'Active' : 'Inactive'}` }
  });
}

function panelPayload(guild) {
  const current = db.getWelcome(guild.id);

  return {
    embeds: [panelEmbed(guild)],
    components: [
      new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId('welcome_channel')
          .setPlaceholder('Select the welcome channel')
          .addChannelTypes(ChannelType.GuildText)
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('welcome_disable')
          .setLabel('Disable welcome')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!current.enabled)
      )
    ]
  };
}

const builder = new SlashCommandBuilder()
  .setName('welcome')
  .setDescription('Configures the member welcome system for this server.')
  .addSubcommand(sub =>
    sub.setName('set')
      .setDescription('Set the welcome channel and custom message')
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('Channel where welcome messages are posted')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('message')
          .setDescription('Custom message. Variables: {user}, {user.mention}, {user.tag}, {server}, {memberCount}')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName('disable')
      .setDescription('Disables welcome messages')
  )
  .addSubcommand(sub =>
    sub.setName('status')
      .setDescription('Shows current welcome system configuration')
  );

module.exports = {
  name: 'welcome',
  aliases: ['wc'],
  description: 'Configures the member welcome system for this server.',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  data: builder,

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message') || DEFAULT_MESSAGE;
      db.setWelcome(interaction.guild.id, { enabled: true, channelId: channel.id, message });
    } else if (sub === 'disable') {
      db.setWelcome(interaction.guild.id, { enabled: false });
    }

    return interaction.reply({
      ...panelPayload(interaction.guild),
      flags: MessageFlags.Ephemeral
    });
  },

  async executePrefix(message, args) {
    const sub = args[0]?.toLowerCase();

    if (sub === 'disable') {
      db.setWelcome(message.guild.id, { enabled: false });
      return message.reply(panelPayload(message.guild));
    }

    const channel = message.mentions.channels.first();
    if (channel) {
      const template = args.slice(1).join(' ') || DEFAULT_MESSAGE;
      db.setWelcome(message.guild.id, { enabled: true, channelId: channel.id, message: template });
    }

    return message.reply(panelPayload(message.guild));
  },

  async handleSelect(interaction) {
    if (!canManage(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('You need Manage Server to change the welcome system.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.customId !== 'welcome_channel') return false;

    const current = db.getWelcome(interaction.guild.id);
    db.setWelcome(interaction.guild.id, {
      enabled: true,
      channelId: interaction.values[0],
      message: current.message || DEFAULT_MESSAGE
    });

    return interaction.update(panelPayload(interaction.guild));
  },

  async handleButton(interaction) {
    if (!canManage(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('You need Manage Server to change the welcome system.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.customId !== 'welcome_disable') return false;

    db.setWelcome(interaction.guild.id, { enabled: false });
    return interaction.update(panelPayload(interaction.guild));
  }
};
