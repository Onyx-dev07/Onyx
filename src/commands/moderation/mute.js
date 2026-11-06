const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const ms = require('ms');
const { errorEmbed, actionEmbed, code } = require('../../utils/embeds');

const DEFAULT_DURATION = '5m';
const MAX_DURATION = 28 * 24 * 60 * 60 * 1000;

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

function muteEmbed({ user, durationMs, reason, moderator, isDefault }) {
  const expiresAt = Math.floor((Date.now() + durationMs) / 1000);

  return actionEmbed({
    title: 'Member Muted',
    icon: 'lock',
    target: `<@${user.id}>`,
    moderator: `<@${moderator.id}>`,
    duration: `${code(ms(durationMs, { long: true }))}${isDefault ? ' (default)' : ''} · <t:${expiresAt}:R>`,
    reason
  });
}

function invalidDurationEmbed(input) {
  return errorEmbed(
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
    const user = interaction.options.getUser('target');
    const rawDuration = interaction.options.getString('duration');
    const isDefault = !rawDuration;
    const durationInput = rawDuration || DEFAULT_DURATION;
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        embeds: [errorEmbed('Member not found in server.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const durationMs = parseDuration(durationInput);
    if (!durationMs) {
      return interaction.reply({
        embeds: [invalidDurationEmbed(durationInput)],
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      await member.timeout(durationMs, `[Onyx Mod] ${reason}`);
      return interaction.reply({
        embeds: [muteEmbed({ user, durationMs, reason, moderator: interaction.user, isDefault })]
      });
    } catch (err) {
      return interaction.reply({
        embeds: [errorEmbed(`Failed to timeout member: ${err.message}`)],
        flags: MessageFlags.Ephemeral
      });
    }
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first() || (await resolveUser(message.client, args[0]));
    if (!user) {
      return message.reply({
        embeds: [errorEmbed('Please specify a member to mute. Usage: `!mute @user [duration] [reason]`')]
      });
    }

    const rawDuration = args[1];
    // Only treat the argument as a duration when `ms` can parse it; otherwise
    // it is the start of the reason and the default 5 minutes applies.
    const intendedDuration = rawDuration !== undefined && typeof ms(rawDuration) === 'number';
    const isDefault = !intendedDuration;
    const durationInput = intendedDuration ? rawDuration : DEFAULT_DURATION;
    const durationMs = parseDuration(durationInput);
    if (!durationMs) {
      return message.reply({ embeds: [invalidDurationEmbed(durationInput)] });
    }

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return message.reply({
        embeds: [errorEmbed('Member not found in server.')]
      });
    }

    const reason = (isDefault ? args.slice(1) : args.slice(2)).join(' ').trim() || 'No reason provided';

    try {
      await member.timeout(durationMs, `[Onyx Mod] ${reason}`);
      return message.reply({
        embeds: [muteEmbed({ user, durationMs, reason, moderator: message.author, isDefault })]
      });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed(`Failed to timeout: ${err.message}`)] });
    }
  }
};
