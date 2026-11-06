const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { errorEmbed, actionEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'unmute',
  aliases: [],
  description: 'Removes the timeout (mute) from a server member.',
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Removes the timeout (mute) from a server member.')
    .addUserOption(option => option.setName('target').setDescription('The member to unmute').setRequired(true)),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('target');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('Member not found in this server.')], flags: MessageFlags.Ephemeral });
    }

    try {
      await member.timeout(null, '[Onyx Mod] Timeout removed');
      return interaction.reply({
        embeds: [actionEmbed({
          title: 'Member Unmuted',
          icon: 'check',
          target: `<@${user.id}>`,
          moderator: `<@${interaction.user.id}>`,
          reason: 'Timeout removed'
        })]
      });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed(`Failed to remove timeout: ${err.message}`)], flags: MessageFlags.Ephemeral });
    }
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first();
    if (!user) {
      return message.reply({ embeds: [errorEmbed('Please specify a member to unmute.')] });
    }

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return message.reply({ embeds: [errorEmbed('Member not found in this server.')] });
    }

    try {
      await member.timeout(null, '[Onyx Mod] Timeout removed');
      return message.reply({
        embeds: [actionEmbed({
          title: 'Member Unmuted',
          icon: 'check',
          target: `<@${user.id}>`,
          moderator: `<@${message.author.id}>`,
          reason: 'Timeout removed'
        })]
      });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed(`Failed to remove timeout: ${err.message}`)] });
    }
  }
};
