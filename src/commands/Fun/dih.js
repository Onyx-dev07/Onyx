import { SlashCommandBuilder } from 'discord.js';

const MIN_SIZE = 1;
const MAX_SIZE = 12;

function randomSize() {
  return Math.floor(Math.random() * (MAX_SIZE - MIN_SIZE + 1)) + MIN_SIZE;
}

function mention(user) {
  return user?.id ? `<@${user.id}>` : String(user);
}

export default {
  data: new SlashCommandBuilder()
    .setName('dih')
    .setDescription('Rolls a random dih size for a member. Purely for fun.')
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The member to roll for (defaults to you)')
        .setRequired(false),
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    return interaction.reply({ content: `${mention(user)}: Your dih is \`${randomSize()} inches\`` });
  },
};
