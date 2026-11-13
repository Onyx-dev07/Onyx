const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { errorEmbed, actionEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'announce',
  aliases: ['ann'],
  description: 'Sends a formatted announcement embed to a chosen channel.',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Sends a formatted announcement embed to a chosen channel.')
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Target channel for announcement')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('title')
        .setDescription('Announcement title')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('message')
        .setDescription('Announcement message body')
        .setRequired(true)
    )
    .addBooleanOption(opt =>
      opt.setName('ping_everyone')
        .setDescription('Whether to ping @everyone')
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.options.getChannel('channel');
    const title = interaction.options.getString('title');
    const content = interaction.options.getString('message');
    const pingEveryone = interaction.options.getBoolean('ping_everyone');

    const embed = {
      title: title,
      description: content,
      author: { name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) }
    };

    try {
      await channel.send({
        content: pingEveryone ? '@everyone' : null,
        embeds: [embed]
      });
      const success = actionEmbed({
        title: 'Announcement Dispatched',
        icon: 'megaphone',
        moderator: `<@${interaction.user.id}>`,
        reason: `Announcement sent to <#${channel.id}>.`,
        fields: [{ name: 'Channel', value: `<#${channel.id}>`, inline: true }]
      });
      return interaction.editReply({ embeds: [success] });
    } catch (err) {
      return interaction.editReply({ embeds: [errorEmbed(`Failed to send announcement: ${err.message}`)] });
    }
  },

  async executePrefix(message, args) {
    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.reply({
        embeds: [errorEmbed('Usage: `!announce #channel Title | Message`')]
      });
    }

    const raw = args.slice(1).join(' ');
    const parts = raw.split('|').map(s => s.trim());
    if (parts.length < 2) {
      return message.reply({
        embeds: [errorEmbed('Usage: `!announce #channel Title | Message`')]
      });
    }

    const title = parts[0];
    const content = parts[1];

    const embed = {
      title: title,
      description: content,
      author: { name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) }
    };

    try {
      await channel.send({ embeds: [embed] });
      const success = actionEmbed({
        title: 'Announcement Dispatched',
        icon: 'megaphone',
        moderator: `<@${message.author.id}>`,
        reason: `Announcement sent to <#${channel.id}>.`,
        fields: [{ name: 'Channel', value: `<#${channel.id}>`, inline: true }]
      });
      await message.reply({ embeds: [success] });
    } catch (err) {
      await message.reply({ embeds: [errorEmbed(`Failed: ${err.message}`)] });
    }
  }
};
