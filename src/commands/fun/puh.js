const { SlashCommandBuilder } = require('discord.js');

const COLORS = ['pink', 'black', 'brown'];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

module.exports = {
  name: 'puh',
  aliases: ['puhmeter'],
  description: 'Rolls a random puh color for a member. Purely for fun.',
  data: new SlashCommandBuilder()
    .setName('puh')
    .setDescription('Rolls a random puh color for a member. Purely for fun.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The member to roll for (defaults to you)')
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    return interaction.reply({ content: `${user}: Your puh is \`${randomColor()}\`` });
  },

  async executePrefix(message) {
    const user = message.mentions.users.first() || message.author;
    return message.reply(`${user}: Your puh is \`${randomColor()}\``);
  }
};
