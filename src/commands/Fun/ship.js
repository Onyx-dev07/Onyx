import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

const VERDICTS = [
  { max: 9, text: 'The algorithm has filed a restraining order.' },
  { max: 24, text: 'Rough seas ahead.' },
  { max: 39, text: "There's a spark... somewhere." },
  { max: 54, text: 'Could work with effort.' },
  { max: 69, text: 'Solid match.' },
  { max: 84, text: 'Strong connection.' },
  { max: 94, text: 'Soulmate material.' },
  { max: 100, text: 'Cosmically inevitable.' },
];

function hash(text) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function compatibility(firstId, secondId) {
  const pair = [firstId, secondId].sort().join(':');
  return hash(pair) % 101;
}

function progressBar(percent) {
  const filled = Math.round((percent / 100) * 10);
  return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)}`;
}

function shipName(firstName, secondName) {
  const clean = (name) => String(name).replace(/[^a-z0-9]/gi, '');
  const first = clean(firstName);
  const second = clean(secondName);

  if (!first || !second) {
    return 'Perfect Match';
  }

  const left = first.slice(0, Math.max(1, Math.ceil(first.length / 2)));
  const right = second.slice(-Math.max(1, Math.floor(second.length / 2)));
  const name = `${left}${right}`.slice(0, 24);

  return name.charAt(0).toUpperCase() + name.slice(1);
}

function verdictFor(percent) {
  return VERDICTS.find((entry) => percent <= entry.max)?.text || VERDICTS[VERDICTS.length - 1].text;
}

function statsFor(first, second) {
  if (first.id === second.id) {
    return {
      percent: 100,
      name: shipName(first.username, second.username),
      verdict: 'Self-love is valid. The council approves.',
    };
  }

  const percent = compatibility(first.id, second.id);
  return {
    percent,
    name: shipName(first.username, second.username),
    verdict: verdictFor(percent),
  };
}

function pickRandom(guild, excludeId) {
  const pool = guild?.members?.cache?.filter((member) => !member.user.bot && member.id !== excludeId);
  return pool?.size ? pool.random().user : null;
}

function shipEmbed(first, second, stats) {
  const color = stats.percent >= 70 ? 'primary' : 'secondary';

  return createEmbed({
    title: 'Ship Meter',
    description: [
      `**${first.username}** + **${second.username}**`,
      progressBar(stats.percent),
      `**${stats.percent}%**`,
      '',
      stats.verdict,
    ].join('\n'),
    fields: [{ name: 'Ship name', value: `**${stats.name}**`, inline: true }],
    color,
  });
}

async function shipPayload(first, second) {
  const stats = statsFor(first, second);
  const color = stats.percent >= 70 ? 'primary' : 'secondary';

  try {
    const { createShipCard } = await import('../../utils/shipCard.js');
    const buffer = await createShipCard({ first, second, ...stats });
    const attachment = new AttachmentBuilder(buffer, { name: 'onyx-ship.gif' });

    return {
      files: [attachment],
      embeds: [
        createEmbed({
          image: 'attachment://onyx-ship.gif',
          color,
        }),
      ],
    };
  } catch (error) {
    logger.warn('Ship card render failed, using text fallback:', error.message);
    return { embeds: [shipEmbed(first, second, stats)] };
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Ships two members and rates their compatibility for fun.')
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The first member (defaults to a random member)')
        .setRequired(false),
    )
    .addUserOption((option) =>
      option
        .setName('user2')
        .setDescription('The second member (defaults to you)')
        .setRequired(false),
    ),

  async execute(interaction) {
    let first = interaction.options.getUser('user');
    let second = interaction.options.getUser('user2');

    if (!first) {
      first = pickRandom(interaction.guild, interaction.user.id) || interaction.user;
    }
    if (!second) {
      second = interaction.user;
    }

    await interaction.deferReply();
    return interaction.editReply(await shipPayload(first, second));
  },
};
