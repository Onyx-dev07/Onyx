const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { createEmbed } = require('../../utils/embeds');
const emojiConfig = require('../../utils/emojiConfig');

function afkPayload(userId, status) {
  const tick = emojiConfig.resolveEmoji('tick', '✅');
  // Inline code renders as a small shaded box around the status. Backticks in
  // the text would close it early, so swap them for apostrophes.
  const safeStatus = String(status).replace(/`/g, "'");

  return {
    embeds: [createEmbed({
      description: `${tick} <@${userId}>: You're now afk with the status: \`${safeStatus}\``,
      footer: false,
      timestamp: false
    })]
  };
}

function setAfk(guildId, userId, status) {
  db.setAfk(guildId, userId, status);
  return afkPayload(userId, status);
}

module.exports = {
  name: 'afk',
  aliases: [],
  description: 'Set your AFK status with an optional message.',

  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Set your AFK status with an optional message.')
    .addStringOption(option => option
      .setName('status')
      .setDescription('Status to show while you are AFK (default: AFK)')
      .setRequired(false)),

  async executeSlash(interaction) {
    const status = interaction.options.getString('status') || 'AFK';
    setAfk(interaction.guild?.id || interaction.guildId, interaction.user.id, status);
    return interaction.reply(afkPayload(interaction.user.id, status));
  },

  async executePrefix(message, args) {
    const status = args.join(' ').trim() || 'AFK';
    setAfk(message.guild.id, message.author.id, status);
    return message.reply(afkPayload(message.author.id, status));
  },
};
