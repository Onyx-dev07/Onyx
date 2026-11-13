import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { avatarURL, userMention } from '../../utils/theme.js';

const COLORS = [
  { name: 'pink', emoji: '🩷', token: 'primary' },
  { name: 'black', emoji: '🖤', token: 'secondary' },
  { name: 'brown', emoji: '🤎', token: 'warning' },
];

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

    const embed = createEmbed({
      title: '🎨 Puh Meter',
      description: [
        `**${userMention(user)}** rolled **${color.name}** ${color.emoji}`,
        '',
        `-# Palette · ${color.name}`,
      ].join('\n'),
      color: color.token,
      thumbnail: avatarURL(user),
      footer: { text: 'Onyx · Fun' },
    });

    return interaction.reply({ embeds: [embed] });
  },
};
