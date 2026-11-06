const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'meme',
  description: 'Fetches a funny meme from Reddit.',
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Fetches a funny meme from Reddit.'),

  async executeSlash(interaction) {
    await interaction.deferReply();
    try {
      const res = await fetch('https://meme-api.com/gimme');
      const data = await res.json();

      if (!data || data.nsfw) {
        return interaction.editReply({ embeds: [errorEmbed('Could not find a family-friendly meme, please try again.')] });
      }

      const embed = createEmbed({
        title: data.title,
        image: data.url,
        description: `Subreddit: r/${data.subreddit} | ${data.ups}`
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed('Failed to fetch meme at this time.')] });
    }
  },

  async executePrefix(message) {
    try {
      const res = await fetch('https://meme-api.com/gimme');
      const data = await res.json();

      if (!data || data.nsfw) {
        return message.reply({ embeds: [errorEmbed('Could not find a family-friendly meme, please try again.')] });
      }

      const embed = createEmbed({
        title: data.title,
        image: data.url,
        description: `Subreddit: r/${data.subreddit} | ${data.ups}`
      });

      await message.reply({ embeds: [embed] });
    } catch (err) {
      await message.reply({ embeds: [errorEmbed('Failed to fetch meme at this time.')] });
    }
  }
};

