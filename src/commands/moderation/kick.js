const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const { sendModerationDM } = require('../../utils/notify');
const {
  actionPayload,
  failurePayload,
  moderationBlock,
  moderationFailure
} = require('../../utils/moderation');

const ACTION = 'kick';

module.exports = {
  name: 'kick',
  description: 'Kicks a member from the server.',
  userPermissions: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kicks a member from the server.')
    .addUserOption(option => option.setName('target').setDescription('The member to kick').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the kick').setRequired(false)),

  async executeSlash(interaction) {
    // Defer up front: fetching the member and DMing them can exceed Discord's
    // three-second window, which would make later replies fail.
    await interaction.deferReply();

    const user = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.editReply(failurePayload('Kick Blocked', 'That member is not in this server.'));
    }

    const problem = moderationBlock(interaction.guild, member, ACTION);
    if (problem) {
      return interaction.editReply(failurePayload('Kick Blocked', problem));
    }

    // Send the DM before the kick removes mutual guild access.
    const dmSent = await sendModerationDM(user, {
      action: 'kick',
      guild: interaction.guild,
      reason,
      moderator: interaction.user.tag
    });

    try {
      await member.kick('[Onyx Mod] ' + reason);
      return interaction.editReply(actionPayload({
        title: 'Member Kicked',
        icon: 'stop',
        target: `<@${user.id}>`,
        moderator: `<@${interaction.user.id}>`,
        reason,
        dmDelivered: dmSent
      }));
    } catch (err) {
      return interaction.editReply(failurePayload('Kick Blocked', moderationFailure(ACTION, err)));
    }
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!user) return message.reply({ embeds: [errorEmbed('Please specify a valid member to kick.')] });

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return message.reply(failurePayload('Kick Blocked', 'That member is not in this server.'));
    }

    const problem = moderationBlock(message.guild, member, ACTION);
    if (problem) {
      return message.reply(failurePayload('Kick Blocked', problem));
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';
    const dmSent = await sendModerationDM(user, {
      action: 'kick',
      guild: message.guild,
      reason,
      moderator: message.author.tag
    });

    try {
      await member.kick('[Onyx Mod] ' + reason);
      return message.reply(actionPayload({
        title: 'Member Kicked',
        icon: 'stop',
        target: `<@${user.id}>`,
        moderator: `<@${message.author.id}>`,
        reason,
        dmDelivered: dmSent
      }));
    } catch (err) {
      return message.reply(failurePayload('Kick Blocked', moderationFailure(ACTION, err)));
    }
  }
};
