const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const ms = require('ms');
const { createEmbed, errorEmbed, successEmbed, infoEmbed, UI } = require('../../utils/embeds');
const config = require('../../../config.json');

// Active giveaways, keyed by message id. Entries live in memory for the
// lifetime of the giveaway, matching the previous reaction-based behaviour.
const giveaways = new Map();

function giveawayEmbed(giveaway) {
  return createEmbed({
    title: 'Giveaway',
    description: [
      `**${giveaway.prize}**`,
      '',
      `Ends <t:${Math.floor(giveaway.endAt / 1000)}:R> ${UI.separator} ${giveaway.winnerCount} ${giveaway.winnerCount === 1 ? 'winner' : 'winners'}`
    ].join('\n'),
    fields: [
      { name: 'Host', value: `<@${giveaway.hostId}>`, inline: true },
      { name: 'Entries', value: String(giveaway.entries.size), inline: true }
    ],
    color: config.colors.warning,
    footer: { text: 'Giveaway' }
  });
}

function entryRow(messageId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway_enter:${messageId}`)
      .setLabel('Enter')
      .setStyle(ButtonStyle.Primary)
  );
}

function closedRow(messageId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway_enter:${messageId}`)
      .setLabel('Closed')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
  );
}

function pickWinners(entries, count) {
  const pool = [...entries];
  const winners = [];

  for (let index = 0; index < Math.min(count, pool.length); index++) {
    const choice = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(choice, 1)[0]);
  }

  return winners;
}

async function finishGiveaway(client, messageId) {
  const giveaway = giveaways.get(messageId);
  if (!giveaway || giveaway.ended) return;

  giveaway.ended = true;
  giveaways.delete(messageId);

  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const message = await channel.messages.fetch(messageId).catch(() => null);
  const winners = pickWinners(giveaway.entries, giveaway.winnerCount);
  const endedAt = new Date(giveaway.endAt).getTime();

  const embed = createEmbed({
    title: 'Giveaway ended',
    description: [
      `**${giveaway.prize}**`,
      '',
      winners.length
        ? `Winner(s) ${UI.separator} ${winners.map(id => `<@${id}>`).join(', ')}`
        : 'No valid entries.',
      '',
      `Hosted by <@${giveaway.hostId}> ${UI.separator} <t:${Math.floor(endedAt / 1000)}:R>`
    ].join('\n'),
    color: winners.length ? config.colors.success : config.colors.primary,
    footer: { text: 'Giveaway' }
  });

  if (message) {
    await message.edit({
      embeds: [embed],
      components: [closedRow(messageId)]
    }).catch(() => {});
  }

  if (winners.length) {
    await channel.send({
      content: `Congratulations ${winners.map(id => `<@${id}>`).join(', ')}. You won **${giveaway.prize}**.`,
      allowedMentions: { users: winners }
    }).catch(() => {});
  } else {
    await channel.send({ content: `No valid entries for **${giveaway.prize}**.` }).catch(() => {});
  }
}

async function startGiveaway({ client, channel, hostId, prize, durationMs, winnerCount }) {
  const endAt = Date.now() + durationMs;
  // Publish first without a button: the real message id is only known after
  // sending, and a "pending" custom id would be a dead button.
  const message = await channel.send({
    embeds: [giveawayEmbed({ prize, hostId, endAt, winnerCount, entries: new Set() })]
  });

  giveaways.set(message.id, {
    messageId: message.id,
    channelId: channel.id,
    hostId,
    prize,
    endAt,
    winnerCount,
    entries: new Set(),
    ended: false
  });

  await message.edit({
    embeds: [giveawayEmbed(giveaways.get(message.id))],
    components: [entryRow(message.id)]
  }).catch(() => {});

  setTimeout(() => {
    void finishGiveaway(client, message.id);
  }, durationMs);

  return message;
}

const builder = new SlashCommandBuilder()
  .setName('giveaway')
  .setDescription('Starts a giveaway in the current channel.')
  .addStringOption(opt =>
    opt.setName('duration')
      .setDescription('Duration of giveaway (e.g. 10m, 1h, 1d)')
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt.setName('prize')
      .setDescription('The prize to be won')
      .setRequired(true)
  )
  .addIntegerOption(opt =>
    opt.setName('winners')
      .setDescription('Number of winners (default: 1)')
      .setMinValue(1)
      .setMaxValue(10)
      .setRequired(false)
  );

module.exports = {
  name: 'giveaway',
  aliases: ['gw'],
  description: 'Starts a giveaway in the current channel.',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  data: builder,

  async executeSlash(interaction) {
    const durationInput = interaction.options.getString('duration');
    const prize = interaction.options.getString('prize');
    const winnerCount = interaction.options.getInteger('winners') || 1;

    const durationMs = ms(durationInput);
    if (!durationMs || durationMs < 5000 || durationMs > 14 * 24 * 60 * 60 * 1000) {
      return interaction.reply({
        embeds: [errorEmbed('Provide a duration between 5 seconds and 14 days (for example 10m or 2h).')],
        flags: MessageFlags.Ephemeral
      });
    }

    // Acknowledge before creating the giveaway message so channel rate limits
    // cannot time out the interaction, and only report success if it worked.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await startGiveaway({
        client: interaction.client,
        channel: interaction.channel,
        hostId: interaction.user.id,
        prize,
        durationMs,
        winnerCount
      });
      return interaction.editReply({ embeds: [successEmbed('Giveaway started.')] });
    } catch (err) {
      return interaction.editReply({ embeds: [errorEmbed(`Could not start the giveaway: ${err.message}`)] });
    }
  },

  async executePrefix(message, args) {
    const durationInput = args[0];
    const prize = args.slice(1).join(' ');

    if (!durationInput || !prize) {
      return message.reply({
        embeds: [errorEmbed('Usage: `!giveaway <duration> <prize>`')]
      });
    }

    const durationMs = ms(durationInput);
    if (!durationMs || durationMs < 5000 || durationMs > 14 * 24 * 60 * 60 * 1000) {
      return message.reply({
        embeds: [errorEmbed('Provide a duration between 5 seconds and 14 days.')]
      });
    }

    await startGiveaway({
      client: message.client,
      channel: message.channel,
      hostId: message.author.id,
      prize,
      durationMs,
      winnerCount: 1
    });
  },

  async handleButton(interaction) {
    if (!interaction.customId.startsWith('giveaway_enter:')) return false;

    const messageId = interaction.customId.split(':')[1];
    const giveaway = giveaways.get(messageId);

    if (!giveaway || giveaway.ended) {
      return interaction.reply({
        embeds: [infoEmbed('This giveaway has ended.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (giveaway.entries.has(interaction.user.id)) {
      return interaction.reply({
        embeds: [infoEmbed('You are already entered in this giveaway.')],
        flags: MessageFlags.Ephemeral
      });
    }

    giveaway.entries.add(interaction.user.id);

    await interaction.reply({
      embeds: [successEmbed('You are entered. Good luck.')],
      flags: MessageFlags.Ephemeral
    });

    if (interaction.message) {
      await interaction.message.edit({
        embeds: [giveawayEmbed(giveaway)]
      }).catch(() => {});
    }
  }
};
