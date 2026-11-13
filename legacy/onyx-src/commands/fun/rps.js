const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

const choices = ['rock', 'paper', 'scissors'];
const emojis = {
  rock: 'Rock',
  paper: 'Paper',
  scissors: 'Scissors'
};

module.exports = {
  name: 'rps',
  description: 'Play Rock, Paper, Scissors against Onyx.',
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Play Rock, Paper, Scissors against Onyx.')
    .addStringOption(opt =>
      opt.setName('choice')
        .setDescription('Choose rock, paper, or scissors')
        .setRequired(true)
        .addChoices(
          { name: 'Rock', value: 'rock' },
          { name: 'Paper', value: 'paper' },
          { name: 'Scissors', value: 'scissors' }
        )
    ),

  async executeSlash(interaction) {
    const userChoice = interaction.options.getString('choice');
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    const result = evaluateWinner(userChoice, botChoice);

    const embed = createEmbed({
      title: 'Rock, Paper, Scissors',
      fields: [
        { name: 'Your Choice', value: emojis[userChoice], inline: true },
        { name: 'Onyx Choice', value: emojis[botChoice], inline: true },
        { name: 'Result', value: `**${result}**`, inline: false }
      ]
    });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const userChoice = args[0]?.toLowerCase();
    if (!choices.includes(userChoice)) {
      return message.reply({
        embeds: [errorEmbed('Choose `rock`, `paper`, or `scissors`. Usage: `!rps rock`')]
      });
    }

    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    const result = evaluateWinner(userChoice, botChoice);

    const embed = createEmbed({
      title: 'Rock, Paper, Scissors',
      fields: [
        { name: 'Your Choice', value: emojis[userChoice], inline: true },
        { name: 'Onyx Choice', value: emojis[botChoice], inline: true },
        { name: 'Result', value: `**${result}**`, inline: false }
      ]
    });

    await message.reply({ embeds: [embed] });
  }
};

function evaluateWinner(user, bot) {
  if (user === bot) return "It's a Tie!";
  if (
    (user === 'rock' && bot === 'scissors') ||
    (user === 'paper' && bot === 'rock') ||
    (user === 'scissors' && bot === 'paper')
  ) {
    return 'You Win!';
  }
  return 'Onyx Wins!';
}

