const { SlashCommandBuilder } = require('discord.js');

const MIN_SIZE = 1;
const MAX_SIZE = 12;

function randomSize() {
  const value = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);
  return value.toFixed(1);
}

module.exports = {
  name: 'dih',
  aliases: ['dihmeter'],
  description: 'Rolls a random dih size for a member. Purely for fun.',
  data: new SlashCommandBuilder()
    .setName('dih')
    .setDescription('Rolls a random dih size for a member. Purely for fun.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The member to roll for (defaults to you)')
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    return interaction.reply({ content: `${user.username}'s dih: ${randomSize()} inches` });
  },

  async executePrefix(message) {
    const user = message.mentions.users.first() || message.author;
    return message.reply(`${user.username}'s dih: ${randomSize()} inches`);
  }
};
