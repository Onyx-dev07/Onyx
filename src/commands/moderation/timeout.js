const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const ms = require('ms');
const { errorEmbed, actionEmbed, code } = require('../../utils/embeds');

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
    const user = interaction.options.getUser('target');
    const durationInput = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('Member not found in server.')], flags: MessageFlags.Ephemeral });
    }

    const durationMs = ms(durationInput);
    if (!durationMs || durationMs < 1000 || durationMs > 28 * 24 * 60 * 60 * 1000) {
      return interaction.reply({
        embeds: [errorEmbed('Please provide a valid duration between 1 second and 28 days (e.g. 10m, 2h, 1d).')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (!member.moderatable) {
      return interaction.reply({
        embeds: [errorEmbed('I cannot timeout this member due to role hierarchy.')],
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      await member.timeout(durationMs, `[Onyx Mod] ${reason}`);
      const expiresAt = Math.floor((Date.now() + durationMs) / 1000);
      await interaction.reply({
        embeds: [actionEmbed({
          title: 'Member Timed Out',
          icon: 'lock',
          target: `<@${user.id}>`,
          moderator: `<@${interaction.user.id}>`,
          duration: `${code(durationInput)} · <t:${expiresAt}:R>`,
          reason
        })]
      });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to timeout member: ${err.message}`)], flags: MessageFlags.Ephemeral });
    }
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!user) {
      return message.reply({ embeds: [errorEmbed('Please specify a member to timeout.')] });
    }

    const durationInput = args[1];
    if (!durationInput) {
      return message.reply({ embeds: [errorEmbed('Please specify a duration (e.g. `!timeout @user 10m [reason]`).')] });
    }

    const durationMs = ms(durationInput);
    if (!durationMs || durationMs < 1000 || durationMs > 28 * 24 * 60 * 60 * 1000) {
      return message.reply({ embeds: [errorEmbed('Duration must be between 1 second and 28 days (e.g. 10m, 1h, 1d).')] });
    }

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member || !member.moderatable) {
      return message.reply({ embeds: [errorEmbed('I cannot timeout this member due to role hierarchy.')] });
    }

    const reason = args.slice(2).join(' ') || 'No reason provided';
    try {
      await member.timeout(durationMs, `[Onyx Mod] ${reason}`);
      const expiresAt = Math.floor((Date.now() + durationMs) / 1000);
      await message.reply({
        embeds: [actionEmbed({
          title: 'Member Timed Out',
          icon: 'lock',
          target: `<@${user.id}>`,
          moderator: `<@${message.author.id}>`,
          duration: `${code(durationInput)} · <t:${expiresAt}:R>`,
          reason
        })]
      });
    } catch (err) {
      await message.reply({ embeds: [errorEmbed(`Failed to timeout: ${err.message}`)] });
    }
  }
};

