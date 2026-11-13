import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { userMention } from '../../utils/theme.js';

const COLORS = ['pink', 'black', 'brown'];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
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
    const color = randomColor();

    return interaction.reply({
      embeds: [
        createEmbed({
          description: `${userMention(user)}'s puh is ${color}.`,
          color: 'primary',
        }),
      ],
    });
  },
};
