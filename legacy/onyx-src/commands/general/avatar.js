const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, UI, cardAuthor, muted } = require('../../utils/embeds');

function getAvatarEmbed(user) {
  const extensions = ['png', 'jpg', 'webp'];
  if (user.avatar?.startsWith('a_')) extensions.push('gif');

  const links = extensions
    .map(extension => `[${extension.toUpperCase()}](${user.displayAvatarURL({ extension, size: 1024 })})`)
    .join(` ${UI.separator} `);

  return createEmbed({
    author: cardAuthor('Avatar', user.displayAvatarURL({ size: 128 })),
    title: user.username,
    description: muted(`Download ${UI.separator} ${links}`),
    image: user.displayAvatarURL({ size: 1024 })
  });
}

module.exports = {
  name: 'avatar',
  aliases: ['av', 'pfp'],
  description: 'Displays the avatar of a specified user or yourself.',
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Displays the avatar of a specified user or yourself.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The user whose avatar you want to view')
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('target') || interaction.user;
    await interaction.reply({ embeds: [getAvatarEmbed(user)] });
  },

  async executePrefix(message, args) {
    let user = message.mentions.users.first();
    if (!user && args[0]) {
      user = await message.client.users.fetch(args[0]).catch(() => null);
    }
    if (!user) user = message.author;

    await message.reply({ embeds: [getAvatarEmbed(user)] });
  }
};
