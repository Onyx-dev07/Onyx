import { SlashCommandBuilder } from 'discord.js';

function mention(user) {
  return user?.id ? `<@${user.id}>` : String(user);
}

function meter(percent) {
  const filled = Math.round((percent / 100) * 10);
  return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)}`;
}

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
      content: `${mention(user)}: You are \`${percent}%\` lesbian.\n\`${meter(percent)}\``,
    });
  },
};
