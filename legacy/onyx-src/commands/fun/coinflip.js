const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
  name: 'coinflip',
  aliases: ['flip', 'coin'],
  description: 'Flips a coin (Heads or Tails).',
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flips a coin (Heads or Tails).'),

  async executeSlash(interaction) {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const embed = createEmbed({
      title: 'Coin Flip',
      description: `The coin landed on **${result}**!`,
      color: result === 'Heads' ? config.colors.success : config.colors.info
    });
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const embed = createEmbed({
      title: 'Coin Flip',
      description: `The coin landed on **${result}**!`,
      color: result === 'Heads' ? config.colors.success : config.colors.info
    });
    await message.reply({ embeds: [embed] });
  }
};

