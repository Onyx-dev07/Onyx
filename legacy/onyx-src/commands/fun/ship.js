const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed, UI } = require('../../utils/embeds');
const { createShipCard } = require('../../utils/shipCard');
const config = require('../../../config.json');

const VERDICTS = [
  { max: 9, text: 'The algorithm has filed a restraining order.' },
  { max: 24, text: 'Rough seas ahead.' },
  { max: 39, text: "There's a spark... somewhere." },
  { max: 54, text: 'Could work with effort.' },
  { max: 69, text: 'Solid match.' },
  { max: 84, text: 'Strong connection.' },
  { max: 94, text: 'Soulmate material.' },
  { max: 100, text: 'Cosmically inevitable.' }
];

function hash(text) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function compatibility(firstId, secondId) {
  const pair = [firstId, secondId].sort().join(':');
  return hash(pair) % 101;
}

function bar(percent) {
  const filled = Math.round((percent / 100) * 10);
  return `${UI.progressFull.repeat(filled)}${UI.progressEmpty.repeat(10 - filled)}`;
}

function shipName(firstName, secondName) {
  const clean = name => String(name).replace(/[^a-z0-9]/gi, '');
  const first = clean(firstName);
  const second = clean(secondName);

  if (!first || !second) return 'Perfect Match';

  const left = first.slice(0, Math.max(1, Math.ceil(first.length / 2)));
  const right = second.slice(-Math.max(1, Math.floor(second.length / 2)));
  const name = `${left}${right}`.slice(0, 24);

  return name.charAt(0).toUpperCase() + name.slice(1);
}

function verdictFor(percent) {
  return VERDICTS.find(entry => percent <= entry.max)?.text || VERDICTS[VERDICTS.length - 1].text;
}

function statsFor(first, second) {
  if (first.id === second.id) {
    return {
      percent: 100,
      name: shipName(first.username, second.username),
      verdict: 'Self-love is valid. The council approves.'
    };
  }

  const percent = compatibility(first.id, second.id);
  return {
    percent,
    name: shipName(first.username, second.username),
    verdict: verdictFor(percent)
  };
}

function pickRandom(guild, excludeId) {
  const pool = guild?.members?.cache?.filter(member => !member.user.bot && member.id !== excludeId);
  return pool?.size ? pool.random().user : null;
}

// Text fallback used only if the image renderer is unavailable.
function shipEmbed(first, second, stats) {
  const color = stats.percent >= 70 ? config.colors.crimson : config.colors.accent;

  return createEmbed({
    title: 'Ship Meter',
    description: [
      `**${first.username}** + **${second.username}**`,
      `${bar(stats.percent)}`,
      `**${stats.percent}%**`,
      '',
      stats.verdict
    ].join('\n'),
    fields: [{ name: 'Ship name', value: `**${stats.name}**`, inline: true }],
    color
  });
}

async function shipPayload(first, second) {
  const stats = statsFor(first, second);
  const color = stats.percent >= 70 ? config.colors.crimson : config.colors.accent;

  try {
    const buffer = await createShipCard({ first, second, ...stats });
    const attachment = new AttachmentBuilder(buffer, { name: 'onyx-ship.png' });

    return {
      files: [attachment],
      embeds: [createEmbed({
        author: false,
        image: 'attachment://onyx-ship.png',
        color
      })]
    };
  } catch (error) {
    console.error('[ship] card render failed:', error.message);
    return { embeds: [shipEmbed(first, second, stats)] };
  }
}

module.exports = {
  name: 'ship',
  aliases: ['match'],
  description: 'Ships two members and rates their compatibility for fun.',
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Ships two members and rates their compatibility for fun.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The first member (defaults to a random member)')
        .setRequired(false)
    )
    .addUserOption(option =>
      option.setName('user2')
        .setDescription('The second member (defaults to you)')
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    const first = interaction.options.getUser('user');
    const second = interaction.options.getUser('user2');
    let pairA = first;
    let pairB = second;

    if (!pairA) pairA = pickRandom(interaction.guild, interaction.user.id) || interaction.user;
    if (!pairB) pairB = interaction.user;

    await interaction.deferReply();
    return interaction.editReply(await shipPayload(pairA, pairB));
  },

  async executePrefix(message) {
    const mentions = [...message.mentions.users.values()];
    let pairA = mentions[0];
    let pairB = mentions[1];

    if (!pairA) pairA = pickRandom(message.guild, message.author.id) || message.author;
    if (!pairB) pairB = message.author;

    return message.reply(await shipPayload(pairA, pairB));
  }
};
