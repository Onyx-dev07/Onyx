import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { userMention } from '../../utils/theme.js';

const BANDS = Array.from({ length: 16 }, (_, index) => 26 + index * 2);
const CUPS = ['AA', 'A', 'B', 'C', 'D', 'DD', 'DDD', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
const SIZES = BANDS.flatMap((band) => CUPS.map((cup) => `${band}${cup}`));

function randomSize() {
  return SIZES[Math.floor(Math.random() * SIZES.length)];
}

export default {
  data: new SlashCommandBuilder()
    .setName('boobs')
    .setDescription('Rolls a random boob size for a member. Purely for fun.')
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
          description: `${userMention(user)}'s boob size is \`${size}\`.`,
          color: 'primary',
          footer: false,
          timestamp: false,
        }),
      ],
    });
  },
};
