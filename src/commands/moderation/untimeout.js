const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { errorEmbed, actionEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'untimeout',
  aliases: [],
  description: 'Removes the timeout (mute) from a server member.',
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Removes the timeout (mute) from a server member.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member to remove timeout from')
        .setRequired(true)
    ),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('target');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('Member not found in this server.')], flags: MessageFlags.Ephemeral });
    }

    try {
      await member.timeout(null, '[Onyx Mod] Timeout removed');
      await interaction.reply({
        embeds: [actionEmbed({
          title: 'Timeout Removed',
          icon: 'check',
          target: `<@${user.id}>`,
          moderator: `<@${interaction.user.id}>`,
          reason: 'Timeout removed'
        })]
      });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to remove timeout: ${err.message}`)], flags: MessageFlags.Ephemeral });
    }
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!user) {
      return message.reply({ embeds: [errorEmbed('Please specify a member to remove timeout from.')] });
    }

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return message.reply({ embeds: [errorEmbed('Member not found in this server.')] });
    }

    try {
      await member.timeout(null, '[Onyx Mod] Timeout removed');
      await message.reply({
        embeds: [actionEmbed({
          title: 'Timeout Removed',
          icon: 'check',
          target: `<@${user.id}>`,
          moderator: `<@${message.author.id}>`,
          reason: 'Timeout removed'
        })]
      });
    } catch (err) {
      await message.reply({ embeds: [errorEmbed(`Failed to remove timeout: ${err.message}`)] });
    }
  }
};
