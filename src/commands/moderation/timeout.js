const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');
const { code } = require('../../utils/embeds');
const {
  actionPayload,
  failurePayload,
  moderationBlock,
  moderationFailure
} = require('../../utils/moderation');

const ACTION = 'time out';
const MAX_DURATION = 28 * 24 * 60 * 60 * 1000;

function invalidDuration() {
  return failurePayload(
    'Timeout Blocked',
    'Provide a valid duration between 1 second and 28 days (e.g. `10m`, `2h`, `1d`).'
  );
}

module.exports = {
  name: 'timeout',
  aliases: [],
  description: 'Times out (mutes) a member for a specified duration.',
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Times out (mutes) a member for a specified duration.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member to timeout')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Duration (e.g. 10m, 1h, 1d)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('target');
    const durationInput = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.editReply(failurePayload('Timeout Blocked', 'That member is not in this server.'));
    }

    const durationMs = ms(durationInput);
    if (!durationMs || durationMs < 1000 || durationMs > MAX_DURATION) {
      return interaction.editReply(invalidDuration());
    }

    const problem = moderationBlock(interaction.guild, member, ACTION);
    if (problem) {
      return interaction.editReply(failurePayload('Timeout Blocked', problem));
    }

    try {
      await member.timeout(durationMs, `[Onyx Mod] ${reason}`);
      const expiresAt = Math.floor((Date.now() + durationMs) / 1000);
      return interaction.editReply(actionPayload({
        title: 'Member Timed Out',
        icon: 'lock',
        target: `<@${user.id}>`,
        moderator: `<@${interaction.user.id}>`,
        duration: `${code(durationInput)} · <t:${expiresAt}:R>`,
        reason
      }));
    } catch (err) {
      return interaction.editReply(failurePayload('Timeout Blocked', moderationFailure(ACTION, err)));
    }
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!user) {
      return message.reply(failurePayload('Timeout Blocked', 'Please specify a member to timeout.'));
    }

    const durationInput = args[1];
    if (!durationInput) {
      return message.reply(failurePayload('Timeout Blocked', 'Please specify a duration (e.g. `!timeout @user 10m [reason]`).'));
    }

    const durationMs = ms(durationInput);
    if (!durationMs || durationMs < 1000 || durationMs > MAX_DURATION) {
      return message.reply(invalidDuration());
    }

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return message.reply(failurePayload('Timeout Blocked', 'That member is not in this server.'));
    }

    const problem = moderationBlock(message.guild, member, ACTION);
    if (problem) {
      return message.reply(failurePayload('Timeout Blocked', problem));
    }

    const reason = args.slice(2).join(' ') || 'No reason provided';
    try {
      await member.timeout(durationMs, `[Onyx Mod] ${reason}`);
      const expiresAt = Math.floor((Date.now() + durationMs) / 1000);
      return message.reply(actionPayload({
        title: 'Member Timed Out',
        icon: 'lock',
        target: `<@${user.id}>`,
        moderator: `<@${message.author.id}>`,
        duration: `${code(durationInput)} · <t:${expiresAt}:R>`,
        reason
      }));
    } catch (err) {
      return message.reply(failurePayload('Timeout Blocked', moderationFailure(ACTION, err)));
    }
  }
};
