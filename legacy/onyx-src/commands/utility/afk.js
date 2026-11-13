const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { errorEmbed, actionEmbed, UI } = require('../../utils/embeds');

module.exports = {
  name: 'afk',
  description: 'Sets your status as AFK (Away From Keyboard) with an optional reason.',
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Sets your status as AFK (Away From Keyboard).')
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for being AFK')
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    const reason = interaction.options.getString('reason') || 'I am currently AFK';
    db.setAfk(interaction.guild.id, interaction.user.id, reason);

    await interaction.reply({
      embeds: [actionEmbed({
        title: 'AFK Set',
        icon: 'idle',
        target: `<@${interaction.user.id}>`,
        moderator: `<@${interaction.user.id}>`,
        reason: reason
      })]
    });
  },

  async executePrefix(message, args) {
    const reason = args.join(' ') || 'I am currently AFK';
    db.setAfk(message.guild.id, message.author.id, reason);

    await message.reply({
      embeds: [actionEmbed({
        title: 'AFK Set',
        icon: 'idle',
        target: `<@${message.author.id}>`,
        moderator: `<@${message.author.id}>`,
        reason: reason
      })]
    });
  }
};
