const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const { sendModerationDM } = require('../../utils/notify');
const {
  actionPayload,
  failurePayload,
  moderationBlock,
  moderationFailure
} = require('../../utils/moderation');

const ACTION = 'ban';

module.exports = {
  name: 'ban',
  description: 'Bans a member from the server.',
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a member from the server.')
    .addUserOption(option => option.setName('target').setDescription('The member to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the ban').setRequired(false)),

  async executeSlash(interaction) {
    // Defer up front: fetching the member and DMing them can exceed Discord's
    // three-second window, which would make later replies fail.
    await interaction.deferReply();

    const user = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (member) {
      const problem = moderationBlock(interaction.guild, member, ACTION);
      if (problem) {
        return interaction.editReply(failurePayload('Ban Blocked', problem));
      }
    }

    // Send the DM before the ban removes mutual guild access.
    const dmSent = await sendModerationDM(user, {
      action: 'ban',
      guild: interaction.guild,
      reason,
      moderator: interaction.user.tag
    });

    try {
      await interaction.guild.members.ban(user.id, { reason: '[Onyx Mod] ' + reason });
      return interaction.editReply(actionPayload({
        title: 'Member Banned',
        icon: 'stop',
        target: `<@${user.id}>`,
        moderator: `<@${interaction.user.id}>`,
        reason,
        dmDelivered: dmSent
      }));
    } catch (err) {
      return interaction.editReply(failurePayload('Ban Blocked', moderationFailure(ACTION, err)));
    }
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!user) return message.reply({ embeds: [errorEmbed('Please specify a valid user to ban.')] });

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (member) {
      const problem = moderationBlock(message.guild, member, ACTION);
      if (problem) {
        return message.reply(failurePayload('Ban Blocked', problem));
      }
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';
    const dmSent = await sendModerationDM(user, {
      action: 'ban',
      guild: message.guild,
      reason,
      moderator: message.author.tag
    });

    try {
      await message.guild.members.ban(user.id, { reason: '[Onyx Mod] ' + reason });
      return message.reply(actionPayload({
        title: 'Member Banned',
        icon: 'stop',
        target: `<@${user.id}>`,
        moderator: `<@${message.author.id}>`,
        reason,
        dmDelivered: dmSent
      }));
    } catch (err) {
      return message.reply(failurePayload('Ban Blocked', moderationFailure(ACTION, err)));
    }
  }
};
