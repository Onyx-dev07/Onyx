const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'dice',
  aliases: ['roll'],
  description: 'Rolls a standard 6-sided dice (or custom sided dice).',
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Rolls a standard 6-sided dice (or custom sided dice).')
    .addIntegerOption(opt =>
      opt.setName('sides')
        .setDescription('Number of sides (default 6, max 100)')
        .setMinValue(2)
        .setMaxValue(100)
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    const sides = interaction.options.getInteger('sides') || 6;
    const roll = Math.floor(Math.random() * sides) + 1;
    const embed = createEmbed({
      title: 'Dice Roll',
      description: `You rolled a **d${sides}** and got: **${roll}**!`
    });
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    let sides = parseInt(args[0], 10);
    if (isNaN(sides) || sides < 2 || sides > 100) sides = 6;
    const roll = Math.floor(Math.random() * sides) + 1;
    const embed = createEmbed({
      title: 'Dice Roll',
      description: `You rolled a **d${sides}** and got: **${roll}**!`
    });
    await message.reply({ embeds: [embed] });
  }
};

