const { SlashCommandBuilder } = require('discord.js');
const config = require('../../../config.json');
const { createEmbed, UI, cardAuthor, muted } = require('../../utils/embeds');

async function resolveUser(message, args) {
  const mentioned = message.mentions.users.first();
  if (mentioned) return mentioned;

  if (args[0]) {
    const user = await message.client.users.fetch(args[0]).catch(() => null);
    if (user) return user;
  }

  return message.author;
}

function bannerLinks(user) {
  const extensions = ['png', 'webp'];
  if (user.banner?.startsWith('a_')) extensions.push('gif');

  return extensions
    .map(extension => `[${extension.toUpperCase()}](${user.bannerURL({ extension, size: 4096 })})`)
    .join(` ${UI.separator} `);
}

async function getBannerEmbed(user) {
  // Banners are not always cached, so always ask Discord for a fresh copy.
  const fresh = await user.fetch(true).catch(() => user);
  const banner = fresh.bannerURL({ size: 1024 });

  if (!banner) {
    return createEmbed({
      author: cardAuthor('Banner', fresh.displayAvatarURL({ size: 128 })),
      title: fresh.username,
      description: `${UI.inactive} This account has no profile banner.`,
      color: config.colors.warning
    });
  }

  return createEmbed({
    author: cardAuthor('Banner', fresh.displayAvatarURL({ size: 128 })),
    title: fresh.username,
    description: muted(`Download ${UI.separator} ${bannerLinks(fresh)}`),
    image: banner
  });
}

module.exports = {
  name: 'banner',
  aliases: ['profilebanner'],
  description: 'Displays the profile banner of a user.',
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription('Displays the profile banner of a user.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User whose banner to show (defaults to you)')
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    await interaction.reply({ embeds: [await getBannerEmbed(user)] });
  },

  async executePrefix(message, args) {
    const user = await resolveUser(message, args);
    await message.reply({ embeds: [await getBannerEmbed(user)] });
  }
};
