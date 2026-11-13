import { SlashCommandBuilder } from 'discord.js';

const COLORS = ['pink', 'black', 'brown'];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function mention(user) {
  return user?.id ? `<@${user.id}>` : String(user);
}

export default {
  data: new SlashCommandBuilder()
    .setName('puh')
    .setDescription('Rolls a random puh color for a member. Purely for fun.')
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The member to roll for (defaults to you)')
        .setRequired(false),
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    return interaction.reply({ content: `${mention(user)}: Your puh is \`${randomColor()}\`` });
  },
};
