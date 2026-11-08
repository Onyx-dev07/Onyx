const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const ms = require('ms');
const {
  actionPayload,
  failurePayload,
  moderationBlock,
  moderationFailure
} = require('../../utils/moderation');

const DEFAULT_DURATION = '5m';
const MAX_DURATION = 28 * 24 * 60 * 60 * 1000;
const ACTION = 'time out';

function parseDuration(input) {
  const value = ms(input);
  if (!value || value < 1000 || value > MAX_DURATION) return null;
  return value;
}

async function resolveUser(client, input) {
  if (!input) return null;
  const id = String(input).replace(/[<@!>]/g, '');
  if (!/^\d{17,20}$/.test(id)) return null;
  return client.users.fetch(id).catch(() => null);
}

function mutePayload({ user, durationMs, reason, moderator, isDefault }) {
  const expiresAt = Math.floor((Date.now() + durationMs) / 1000);

  return actionPayload({
    title: 'Member Muted',
    icon: 'lock',
    target: `<@${user.id}>`,
    moderator: `<@${moderator.id}>`,
    duration: `${ms(durationMs, { long: true })}${isDefault ? ' (default)' : ''}`,
    fields: [{ name: 'Expires', value: `<t:${expiresAt}:R>` }],
    reason
  });
}

function invalidDuration(input) {
  return failurePayload(
    'Mute Blocked',
    `**${input}** is not a valid duration. Use a value between 1 second and 28 days, for example \`5m\`, \`1h\`, or \`1d\`.`
  );
}

module.exports = {
  name: 'mute',
  aliases: [],
  description: 'Times out (mutes) a member for 5 minutes by default.',
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Times out (mutes) a member for 5 minutes by default.')
    .addUserOption(option => option.setName('target').setDescription('The member to mute').setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Duration (e.g. 10m, 1h, 1d). Defaults to 5m.')
        .setRequired(false)
    )
    .addStringOption(option => option.setName('reason').setDescription('Reason for the timeout').setRequired(false)),

  async executeSlash(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('target');
    const rawDuration = interaction.options.getString('duration');
    const isDefault = !rawDuration;
    const durationInput = rawDuration || DEFAULT_DURATION;
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.editReply(failurePayload('Mute Blocked', 'That member is not in this server.'));
    }

    const durationMs = parseDuration(durationInput);
    if (!durationMs) {
      return interaction.editReply(invalidDuration(durationInput));
    }

    const problem = moderationBlock(interaction.guild, member, ACTION);
    if (problem) {
      return interaction.editReply(failurePayload('Mute Blocked', problem));
    }

    try {
      await member.timeout(durationMs, `[Onyx Mod] ${reason}`);
      return interaction.editReply(mutePayload({ user, durationMs, reason, moderator: interaction.user, isDefault }));
    } catch (err) {
      return interaction.editReply(failurePayload('Mute Blocked', moderationFailure(ACTION, err)));
    }
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first() || (await resolveUser(message.client, args[0]));
    if (!user) {
      return message.reply(failurePayload(
        'Mute Blocked',
        'Please specify a member to mute. Usage: `!mute @user [duration] [reason]`'
      ));
    }

    const rawDuration = args[1];
    // Only treat the argument as a duration when `ms` can parse it; otherwise
    // it is the start of the reason and the default 5 minutes applies.
    const intendedDuration = rawDuration !== undefined && typeof ms(rawDuration) === 'number';
    const isDefault = !intendedDuration;
    const durationInput = intendedDuration ? rawDuration : DEFAULT_DURATION;
    const durationMs = parseDuration(durationInput);
    if (!durationMs) {
      return message.reply(invalidDuration(durationInput));
    }

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return message.reply(failurePayload('Mute Blocked', 'That member is not in this server.'));
    }

    const problem = moderationBlock(message.guild, member, ACTION);
    if (problem) {
      return message.reply(failurePayload('Mute Blocked', problem));
    }

    const reason = (isDefault ? args.slice(1) : args.slice(2)).join(' ').trim() || 'No reason provided';

    try {
      await member.timeout(durationMs, `[Onyx Mod] ${reason}`);
      return message.reply(mutePayload({ user, durationMs, reason, moderator: message.author, isDefault }));
    } catch (err) {
      return message.reply(failurePayload('Mute Blocked', moderationFailure(ACTION, err)));
    }
  }
};
