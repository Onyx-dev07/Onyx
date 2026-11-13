import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { userMention } from '../../utils/theme.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lesbian')
    .setDescription('Rolls a random lesbian percentage for a member. Purely for fun.')
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The member to roll for (defaults to you)')
        .setRequired(false),
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const percent = Math.floor(Math.random() * 100) + 1;

    return interaction.reply({
      embeds: [
        createEmbed({
          description: `${userMention(user)} is ${percent}% lesbian.`,
          color: 'primary',
        }),
      ],
    });
  },
};
