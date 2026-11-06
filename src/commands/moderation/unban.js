const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { errorEmbed, actionEmbed } = require('../../utils/embeds');

// Accepts a raw id, a mention, or a prefixed id and returns the snowflake.
function parseUserId(input) {
  const id = String(input || '').replace(/[<@!>]/g, '').trim();
  return /^\d{17,20}$/.test(id) ? id : null;
}

module.exports = {
  name: 'unban',
  description: 'Unbans a user from the server using their user ID.',
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unbans a user from the server using their user ID.')
    .addStringOption(option =>
      option.setName('userid')
        .setDescription('The user ID to unban')
        .setRequired(true)
    ),

  async executeSlash(interaction) {
    const userId = parseUserId(interaction.options.getString('userid'));
    if (!userId) {
      return interaction.reply({
        embeds: [errorEmbed('Provide a valid user ID or mention.')],
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      await interaction.guild.bans.remove(userId, '[Onyx Mod] Unbanned by command');
      await interaction.reply({
        embeds: [actionEmbed({
          title: 'Member Unbanned',
          icon: 'check',
          target: `<@${userId}>`,
          moderator: `<@${interaction.user.id}>`,
          reason: 'Unbanned by command'
        })]
      });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to unban: ${err.message}`)], flags: MessageFlags.Ephemeral });
    }
  },

  async executePrefix(message, args) {
    const userId = parseUserId(message.mentions.users.first()?.id || args[0]);
    if (!userId) {
      return message.reply({ embeds: [errorEmbed('Please provide a valid user ID or mention to unban.')] });
    }

    try {
      await message.guild.bans.remove(userId, '[Onyx Mod] Unbanned by command');
      await message.reply({
        embeds: [actionEmbed({
          title: 'Member Unbanned',
          icon: 'check',
          target: `<@${userId}>`,
          moderator: `<@${message.author.id}>`,
          reason: 'Unbanned by command'
        })]
      });
    } catch (err) {
      await message.reply({ embeds: [errorEmbed(`Failed to unban: ${err.message}`)] });
    }
  }
};
