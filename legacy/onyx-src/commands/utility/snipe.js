const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'snipe',
  description: 'Reveals the most recently deleted message in this channel.',
  data: new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('Reveals the most recently deleted message in this channel.'),

  async executeSlash(interaction, client) {
    const snipe = client.snipes?.get(interaction.channel.id);
    if (!snipe) {
      return interaction.reply({ embeds: [errorEmbed('There are no recently deleted messages in this channel.')], flags: MessageFlags.Ephemeral });
    }

    const embed = createEmbed({
      title: 'Snipe',
      description: snipe.content,
      author: { name: snipe.author.tag, iconURL: snipe.author.displayAvatarURL({ dynamic: true }) },
      image: snipe.image || undefined,
      footer: { text: `Deleted • ${Math.floor((Date.now() - snipe.timestamp) / 1000)}s ago` }
    });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args, client) {
    const snipe = client.snipes?.get(message.channel.id);
    if (!snipe) {
      return message.reply({ embeds: [errorEmbed('There are no recently deleted messages in this channel.')] });
    }

    const embed = createEmbed({
      title: 'Snipe',
      description: snipe.content,
      author: { name: snipe.author.tag, iconURL: snipe.author.displayAvatarURL({ dynamic: true }) },
      image: snipe.image || undefined,
      footer: { text: `Deleted • ${Math.floor((Date.now() - snipe.timestamp) / 1000)}s ago` }
    });

    await message.reply({ embeds: [embed] });
  }
};

