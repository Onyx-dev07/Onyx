const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { actionPayload, failurePayload, moderationFailure } = require('../../utils/moderation');

const ACTION = 'unban';

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
        ...failurePayload('Unban Blocked', 'Provide a valid user ID or mention.'),
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      await interaction.guild.bans.remove(userId, '[Onyx Mod] Unbanned by command');
      return interaction.reply(actionPayload({
        title: 'Member Unbanned',
        icon: 'check',
        target: `<@${userId}>`,
        moderator: `<@${interaction.user.id}>`,
        reason: 'Unbanned by command'
      }));
    } catch (err) {
      return interaction.reply({
        ...failurePayload('Unban Blocked', moderationFailure(ACTION, err)),
        flags: MessageFlags.Ephemeral
      });
    }
  },

  async executePrefix(message, args) {
    const userId = parseUserId(message.mentions.users.first()?.id || args[0]);
    if (!userId) {
      return message.reply(failurePayload('Unban Blocked', 'Please provide a valid user ID or mention to unban.'));
    }

    try {
      await message.guild.bans.remove(userId, '[Onyx Mod] Unbanned by command');
      return message.reply(actionPayload({
        title: 'Member Unbanned',
        icon: 'check',
        target: `<@${userId}>`,
        moderator: `<@${message.author.id}>`,
        reason: 'Unbanned by command'
      }));
    } catch (err) {
      return message.reply(failurePayload('Unban Blocked', moderationFailure(ACTION, err)));
    }
  }
};
