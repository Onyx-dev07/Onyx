import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { userMention } from '../../utils/theme.js';

const MIN_SIZE = 1;
const MAX_SIZE = 12;

function randomSize() {
  return Math.floor(Math.random() * (MAX_SIZE - MIN_SIZE + 1)) + MIN_SIZE;
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
    const size = randomSize();

    return interaction.reply({
      embeds: [
        createEmbed({
          description: `${userMention(user)}'s dih is ${size} inches.`,
          color: 'primary',
        }),
      ],
    });
  },
};
