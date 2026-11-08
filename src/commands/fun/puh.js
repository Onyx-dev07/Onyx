const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const config = require('../../../config.json');

const VERDICTS = [
  { max: 2, text: 'Dry spell. Hydration check.' },
  { max: 4, text: 'A mild breeze.' },
  { max: 6, text: 'Comfortably moisturized.' },
  { max: 8, text: 'Certified puh.' },
  { max: 9, text: 'Aura overload.' },
  { max: 10, text: 'Weather warning in effect.' }
];

function dailySeed(userId, salt) {
  const day = new Date().toISOString().slice(0, 10);
  const text = `${userId}:${salt}:${day}`;
  let value = 2166136261;

  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }

  return value >>> 0;
}

function dailyTenths(userId, salt, maxTenths) {
  const seed = dailySeed(userId, salt);
  return (seed % maxTenths) + 1;
}

function bar(tenths, maxTenths, segments) {
  const filled = Math.round((tenths / maxTenths) * segments);
  return `${'━'.repeat(filled)}${'─'.repeat(segments - filled)}`;
}

function verdictFor(value) {
  return VERDICTS.find(entry => value <= entry.max)?.text || VERDICTS[VERDICTS.length - 1].text;
}

function puhPayload(user) {
  const tenths = dailyTenths(user.id, 'puh', 100);
  const value = tenths / 10;

  return createEmbed({
    title: 'Puh Meter',
    description: [
      `**${user.username}**`,
      bar(tenths, 100, 10),
      `**${value.toFixed(1)} / 10.0**`,
      '',
      verdictFor(value)
    ].join('\n'),
    fields: [{ name: 'Reading', value: 'Today’s puh energy. Purely for fun.', inline: false }],
    color: config.colors.accent
  });
}

module.exports = {
  name: 'puh',
  aliases: ['puhmeter'],
  description: 'Rates a member\'s puh energy for the day. Purely for fun.',
  data: new SlashCommandBuilder()
    .setName('puh')
    .setDescription('Rates a member\'s puh energy for the day. Purely for fun.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The member to rate (defaults to you)')
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    return interaction.reply({ embeds: [puhPayload(user)] });
  },

  async executePrefix(message) {
    const user = message.mentions.users.first() || message.author;
    return message.reply({ embeds: [puhPayload(user)] });
  }
};
