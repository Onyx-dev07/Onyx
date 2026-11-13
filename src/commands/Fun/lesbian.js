import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { avatarURL, progressLabel, userMention } from '../../utils/theme.js';

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

    const embed = createEmbed({
      title: '🩷 Lesbian Meter',
      description: [
        `**${userMention(user)}** scored **${percent}%**.`,
        '',
        progressLabel(percent),
      ].join('\n'),
      color: 'primary',
      thumbnail: avatarURL(user),
    });

    return interaction.reply({ embeds: [embed] });
  },
};
