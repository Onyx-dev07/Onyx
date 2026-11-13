const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, cardAuthor, quote, code, UI } = require('../../utils/embeds');

function latencyBar(value) {
  const steps = 5;
  const filled = value < 60 ? 5 : value < 120 ? 4 : value < 250 ? 3 : value < 500 ? 2 : 1;
  return `${UI.progressFull.repeat(filled)}${UI.progressEmpty.repeat(steps - filled)}`;
}

function latencyEmbed(client, roundtrip, websocket) {
  return createEmbed({
    author: cardAuthor('Latency', client.user.displayAvatarURL({ size: 128 })),
    title: 'Connection',
    description: [
      quote(`Gateway ${latencyBar(websocket)} ${code(`${websocket}ms`)}`),
      quote(`Roundtrip ${latencyBar(roundtrip)} ${code(`${roundtrip}ms`)}`)
    ].join('\n')
  });
}

module.exports = {
  name: 'ping',
  description: 'Displays the bot response latency and Discord WebSocket ping.',
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Displays the bot response latency and Discord WebSocket ping.'),

  async executeSlash(interaction) {
    const sent = await interaction.reply({ embeds: [createEmbed({ description: 'Measuring latency.' })], fetchReply: true });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply({ content: null, embeds: [latencyEmbed(interaction.client, roundtrip, interaction.client.ws.ping)] });
  },

  async executePrefix(message) {
    const sent = await message.reply({ embeds: [createEmbed({ description: 'Measuring latency.' })] });
    const roundtrip = sent.createdTimestamp - message.createdTimestamp;
    await sent.edit({ content: null, embeds: [latencyEmbed(message.client, roundtrip, message.client.ws.ping)] });
  }
};
