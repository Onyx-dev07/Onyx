const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  StringSelectMenuBuilder
} = require('discord.js');
const db = require('../../database');
const config = require('../../../config.json');
const { createEmbed, errorEmbed, muted, UI } = require('../../utils/embeds');

function canManage(interaction) {
  return interaction.member?.permissions?.has(PermissionFlagsBits.ManageChannels);
}

function panelEmbed(guild) {
  const channels = db.getMediaChannels(guild.id);

  return createEmbed({
    title: 'Media-only channels',
    description: [
      channels.length
        ? channels.map(id => `<#${id}>`).join('\n')
        : 'No channels are restricted to media.',
      '',
      muted('Text-only messages are removed in these channels. Attachments and links are allowed.')
    ].join('\n'),
    color: channels.length ? config.colors.success : config.colors.primary,
    footer: { text: `Media ${UI.separator} ${channels.length} ${channels.length === 1 ? 'channel' : 'channels'}` }
  });
}

function panelPayload(guild) {
  const channels = db.getMediaChannels(guild.id);
  const rows = [
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('media_add')
        .setPlaceholder('Add a media-only channel')
        .addChannelTypes(ChannelType.GuildText)
    )
  ];

  if (channels.length) {
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('media_remove')
        .setPlaceholder('Remove a media-only channel')
        .addOptions(channels.slice(0, 25).map(id => ({
          label: `#${guild.channels.cache.get(id)?.name || id}`.slice(0, 100),
          value: id
        })))
    ));
  }

  return { embeds: [panelEmbed(guild)], components: rows };
}

const builder = new SlashCommandBuilder()
  .setName('media')
  .setDescription('Designates media-only channels where text-only messages are automatically removed.')
  .addSubcommand(sub =>
    sub.setName('add')
      .setDescription('Set a channel as media-only')
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('Target text channel')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('remove')
      .setDescription('Remove media-only restriction from a channel')
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('Target text channel')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('List all media-only channels')
  );

module.exports = {
  name: 'media',
  aliases: ['mediaonly'],
  description: 'Designates channels where only images, videos, attachments, or media links are allowed.',
  userPermissions: [PermissionFlagsBits.ManageChannels],
  data: builder,

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel('channel');

    if (sub === 'add') {
      db.addMediaChannel(interaction.guild.id, channel.id);
    } else if (sub === 'remove') {
      db.removeMediaChannel(interaction.guild.id, channel.id);
    }

    if (sub === 'list') {
      const channels = db.getMediaChannels(interaction.guild.id);
      if (!channels.length) {
        return interaction.reply({ embeds: [panelEmbed(interaction.guild)], flags: MessageFlags.Ephemeral });
      }
    }

    return interaction.reply({
      ...panelPayload(interaction.guild),
      flags: MessageFlags.Ephemeral
    });
  },

  async executePrefix(message, args) {
    const sub = args[0]?.toLowerCase();
    const channel = message.mentions.channels.first()
      || (args[1] ? message.guild.channels.cache.get(args[1]) : null);

    if (sub === 'add' || sub === 'set') {
      if (!channel) {
        return message.reply({
          embeds: [errorEmbed(`Usage: \`!media add #channel\``)]
        });
      }
      db.addMediaChannel(message.guild.id, channel.id);
    } else if (sub === 'remove' || sub === 'del') {
      if (!channel) {
        return message.reply({
          embeds: [errorEmbed(`Usage: \`!media remove #channel\``)]
        });
      }
      db.removeMediaChannel(message.guild.id, channel.id);
    }

    return message.reply(panelPayload(message.guild));
  },

  async handleSelect(interaction) {
    if (!canManage(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('You need Manage Channels to change media-only channels.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.customId === 'media_add') {
      db.addMediaChannel(interaction.guild.id, interaction.values[0]);
    } else if (interaction.customId === 'media_remove') {
      db.removeMediaChannel(interaction.guild.id, interaction.values[0]);
    } else {
      return false;
    }

    return interaction.update(panelPayload(interaction.guild));
  }
};
