const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const ms = require('ms');
const { createEmbed, errorEmbed, actionEmbed } = require('../../utils/embeds');
const config = require('../../../config.json');

// setTimeout clamps delays above 2^31-1 ms to 1 ms, which would fire the
// reminder immediately. Keep timers inside Node's supported range.
const MAX_REMINDER_MS = 2147483647;

module.exports = {
  name: 'remind',
  aliases: ['reminder'],
  description: 'Sets a reminder for yourself.',
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Sets a reminder for yourself.')
    .addStringOption(opt =>
      opt.setName('time')
        .setDescription('Time until reminder (e.g. 10m, 1h, 2d)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('message')
        .setDescription('Reminder message')
        .setRequired(true)
    ),

  async executeSlash(interaction) {
    const timeInput = interaction.options.getString('time');
    const reminderNote = interaction.options.getString('message');

    const durationMs = ms(timeInput);
    if (!durationMs || durationMs < 5000 || durationMs > MAX_REMINDER_MS) {
      return interaction.reply({
        embeds: [errorEmbed('Please provide a valid time between 5 seconds and 24 days (e.g. 10m, 1h, 2d).')],
        flags: MessageFlags.Ephemeral
      });
    }

    const triggerTime = Math.floor((Date.now() + durationMs) / 1000);
    await interaction.reply({
      embeds: [actionEmbed({
        title: 'Reminder Set',
        icon: 'clock',
        target: `<@${interaction.user.id}>`,
        moderator: `<@${interaction.user.id}>`,
        reason: reminderNote,
        fields: [{ name: 'Trigger Time', value: `<t:${triggerTime}:R>`, inline: true }]
      })]
    });

    setTimeout(async () => {
      try {
        const embed = createEmbed({
          title: 'Reminder',
          description: `You asked me to remind you:\n> **${reminderNote}**\n\nSet in: **${interaction.guild?.name || 'DM'}**`,
          color: config.colors.primary
        });
        await interaction.user.send({ embeds: [embed] }).catch(() => {});
      } catch (err) {}
    }, durationMs);
  },

  async executePrefix(message, args) {
    const timeInput = args[0];
    const reminderNote = args.slice(1).join(' ');

    if (!timeInput || !reminderNote) {
      return message.reply({
        embeds: [errorEmbed('Usage: `!remind <time> <message>` (for example `!remind 30m check oven`)')]
      });
    }

    const durationMs = ms(timeInput);
    if (!durationMs || durationMs < 5000 || durationMs > MAX_REMINDER_MS) {
      return message.reply({ embeds: [errorEmbed('Please provide a valid time between 5 seconds and 24 days (e.g. 10m, 1h, 2d).')] });
    }

    const triggerTime = Math.floor((Date.now() + durationMs) / 1000);
    await message.reply({
      embeds: [actionEmbed({
        title: 'Reminder Set',
        icon: 'clock',
        target: `<@${message.author.id}>`,
        moderator: `<@${message.author.id}>`,
        reason: reminderNote,
        fields: [{ name: 'Trigger Time', value: `<t:${triggerTime}:R>`, inline: true }]
      })]
    });

    setTimeout(async () => {
      try {
        const embed = createEmbed({
          title: 'Reminder',
          description: `You asked me to remind you:\n> **${reminderNote}**`,
          color: config.colors.primary
        });
        await message.author.send({ embeds: [embed] }).catch(() => {});
      } catch (err) {}
    }, durationMs);
  }
};
