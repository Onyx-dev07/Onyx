const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const db = require('../../database');
const config = require('../../../config.json');
const logger = require('../../utils/logger');
const { createEmbed, errorEmbed, receiptEmbed, UI } = require('../../utils/embeds');

const MODE_LABEL = {
  webhook: 'Webhook',
  message: 'Bot message'
};

const BURST_MIN = 1;
const BURST_MAX = 10;
const BURST_DEFAULT = 5;

function parseId(customId) {
  const [, mode, burst] = customId.split(':');
  return {
    mode: mode === 'message' ? 'message' : 'webhook',
    burst: clampBurst(Number.parseInt(burst, 10))
  };
}

function clampBurst(value) {
  if (!Number.isFinite(value)) return BURST_DEFAULT;
  return Math.min(BURST_MAX, Math.max(BURST_MIN, Math.trunc(value)));
}

// One webhook per channel, reused for every click and removed after ten idle
// minutes, so repeated sends stay fast without leaving a sender behind.
const WEBHOOK_NAME = 'Onyx Spam';
const LEGACY_WEBHOOK_NAMES = ['Onyx Promo'];
const WEBHOOK_IDLE_MS = 10 * 60 * 1000;
const hooks = new Map();

// Sends for a channel drain through one queue. Clicks return immediately and
// the queue posts back-to-back at whatever pace Discord's rate limits allow,
// instead of racing the API and stalling on 429 retries.
const queues = new Map();

function enqueue(channelId, task) {
  let state = queues.get(channelId);
  if (!state) {
    state = { chain: Promise.resolve(), pending: 0 };
    queues.set(channelId, state);
  }

  state.pending += 1;
  const run = state.chain.then(task, task);
  state.chain = run.then(() => undefined, () => undefined);

  return run.finally(() => {
    state.pending -= 1;
    if (state.pending === 0 && queues.get(channelId) === state) {
      queues.delete(channelId);
    }
  });
}

function dropHook(channelId) {
  const entry = hooks.get(channelId);
  if (!entry) return;
  hooks.delete(channelId);
  clearTimeout(entry.timer);
  entry.webhook.delete('[Onyx SpamRaid] Sender idle').catch(() => {});
}

function keepHook(channelId, webhook) {
  const previous = hooks.get(channelId);
  if (previous) clearTimeout(previous.timer);

  const timer = setTimeout(() => dropHook(channelId), WEBHOOK_IDLE_MS);
  if (typeof timer.unref === 'function') timer.unref();

  hooks.set(channelId, { webhook, timer });
}

async function promoHook(channel) {
  const cached = hooks.get(channel.id);
  if (cached) {
    keepHook(channel.id, cached.webhook);
    return cached.webhook;
  }

  // Reuse a sender webhook left over from before a restart instead of stacking
  // a second sender in the same channel. Older panels used the "Onyx Promo"
  // name, so adopt and rename those too.
  const existing = (await channel.fetchWebhooks().catch(() => null))
    ?.find(hook => [WEBHOOK_NAME, ...LEGACY_WEBHOOK_NAMES].includes(hook.name)
      && hook.owner?.id === channel.client.user.id);

  const webhook = existing && existing.name !== WEBHOOK_NAME
    ? await existing.edit({ name: WEBHOOK_NAME }).catch(() => existing)
    : existing || await channel.createWebhook({
      name: WEBHOOK_NAME,
      reason: '[Onyx SpamRaid] Sender'
    });

  keepHook(channel.id, webhook);
  return webhook;
}

async function sendOnce(channel, text, mode) {
  if (mode === 'message') {
    await channel.send({ content: text });
    return;
  }

  const webhook = await promoHook(channel);

  try {
    await webhook.send({ content: text });
  } catch {
    // The webhook was removed outside the bot: replace it once and retry.
    dropHook(channel.id);
    const fresh = await promoHook(channel);
    await fresh.send({ content: text });
  }
}

async function sendBatch(channel, text, mode, count) {
  const total = clampBurst(count);
  for (let index = 0; index < total; index++) {
    await sendOnce(channel, text, mode);
  }
}

// Creating the sender while the panel is posted removes the first-click delay.
function prewarm(channel, mode) {
  if (mode !== 'webhook') return;
  promoHook(channel).catch(() => {});
}

function panelEmbed(text, mode, burst) {
  return createEmbed({
    title: 'Spam Panel',
    description: text,
    fields: [
      { name: 'MODE', value: MODE_LABEL[mode], inline: true },
      { name: 'BURST', value: `×${burst}`, inline: true }
    ],
    footer: { text: 'Send posts once · Burst posts the batch · Custom opens the editor' },
    color: config.colors.crimson
  });
}

function panelPayload(text, mode, burst) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`spamraid_send:${mode}:${burst}`)
      .setLabel('Send')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`spamraid_burst:${mode}:${burst}`)
      .setLabel(`Burst ×${burst}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(burst <= 1),
    new ButtonBuilder()
      .setCustomId(`spamraid_custom:${mode}:${burst}`)
      .setLabel('Custom message')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`spamraid_mode:${mode === 'webhook' ? 'message' : 'webhook'}:${burst}`)
      .setLabel(mode === 'webhook' ? 'Use bot message' : 'Use webhook')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [panelEmbed(text, mode, burst)], components: [row] };
}

function deployHint(panel, burst) {
  const link = panel?.url ? `Panel ${panel.url} · ` : '';
  return `${link}Send posts once, Burst posts ${burst} at once, or Custom message for your own text.`;
}

async function post(interaction, channel, text, mode, burst) {
  const panel = await channel.send(panelPayload(text, mode, burst));
  prewarm(channel, mode);

  return interaction.reply({
    embeds: [receiptEmbed({
      headline: 'Spam panel deployed',
      lines: [
        `Channel ${UI.separator} <#${channel.id}>`,
        `Mode ${UI.separator} ${MODE_LABEL[mode]}`,
        `Burst ${UI.separator} ×${burst}`
      ],
      hint: deployHint(panel, burst),
      source: 'SpamRaid'
    })],
    flags: MessageFlags.Ephemeral
  });
}

function usage(prefix) {
  return `${prefix}spamraid [webhook|message] [x1-x${BURST_MAX}] <text> ${UI.separator} posts the spam panel`;
}

module.exports = {
  name: 'spamraid',
  aliases: ['promo', 'promobroadcast'],
  description: 'Posts a click-to-send spam panel with Send, Burst, and custom message controls.',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('spamraid')
    .setDescription('Posts a click-to-send spam panel with Send, Burst, and custom message controls.')
    .addStringOption(opt =>
      opt.setName('message')
        .setDescription('Text the Send button posts')
        .setMaxLength(2000)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('mode')
        .setDescription('How each click sends the message')
        .addChoices(
          { name: 'Webhook', value: 'webhook' },
          { name: 'Bot message', value: 'message' }
        )
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('burst')
        .setDescription(`Messages per Burst click (default ${BURST_DEFAULT})`)
        .setMinValue(BURST_MIN)
        .setMaxValue(BURST_MAX)
        .setRequired(false)
    )
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel to post the panel in (defaults to this one)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    const text = interaction.options.getString('message').trim();
    const mode = interaction.options.getString('mode') || 'webhook';
    const burst = clampBurst(interaction.options.getInteger('burst') || BURST_DEFAULT);
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    if (!channel?.isTextBased?.()) {
      return interaction.reply({
        embeds: [errorEmbed('Pick a text channel for the spam panel.')],
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      await post(interaction, channel, text, mode, burst);
    } catch (err) {
      const payload = {
        embeds: [errorEmbed(`Could not post the spam panel: ${err.message}`)],
        flags: MessageFlags.Ephemeral
      };

      if (interaction.replied || interaction.deferred) return interaction.followUp(payload).catch(() => {});
      return interaction.reply(payload).catch(() => {});
    }
  },

  async executePrefix(message, args) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({ embeds: [errorEmbed('You need Manage Server to post a spam panel.')] });
    }

    const rest = [...args];
    let mode = 'webhook';
    let burst = BURST_DEFAULT;

    if (rest[0]?.toLowerCase() === 'webhook' || rest[0]?.toLowerCase() === 'message') {
      mode = rest.shift().toLowerCase();
    }

    if (/^x\d{1,2}$/i.test(rest[0] || '')) {
      burst = clampBurst(Number.parseInt(rest.shift().slice(1), 10));
    }

    const text = rest.join(' ').trim();
    if (!text) {
      const prefix = db.getPrefix(message.guild.id, process.env.DEFAULT_PREFIX || config.defaultPrefix || '!');
      return message.reply({ embeds: [errorEmbed(`Give me text to send.\n${usage(prefix)}`)] });
    }

    try {
      const panel = await message.channel.send(panelPayload(text, mode, burst));
      prewarm(message.channel, mode);
      await message.reply({
        embeds: [receiptEmbed({
          headline: 'Spam panel deployed',
          lines: [
            `Channel ${UI.separator} <#${message.channel.id}>`,
            `Mode ${UI.separator} ${MODE_LABEL[mode]}`,
            `Burst ${UI.separator} ×${burst}`
          ],
          hint: deployHint(panel, burst),
          source: 'SpamRaid'
        })]
      });
    } catch (err) {
      await message.reply({ embeds: [errorEmbed(`Could not post the spam panel: ${err.message}`)] });
    }
  },

  async handleButton(interaction) {
    if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        embeds: [errorEmbed('You need Manage Server to send from this panel.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const { mode, burst } = parseId(interaction.customId);
    const embed = interaction.message.embeds[0];
    const text = embed?.description || embed?.data?.description;

    if (!text) {
      return interaction.reply({
        embeds: [errorEmbed('This panel lost its message text. Run `/spamraid` again.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.customId.startsWith('spamraid_mode:')) {
      return interaction.update(panelPayload(text, mode, burst));
    }

    if (interaction.customId.startsWith('spamraid_custom:')) {
      const modal = new ModalBuilder()
        .setCustomId(`spamraid_custom_modal:${mode}`)
        .setTitle('Custom spam message')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('promo_text')
              .setLabel('Message')
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(2000)
              .setRequired(true)
          )
        );

      return interaction.showModal(modal);
    }

    // Acknowledge immediately; the queue handles pacing so rapid clicks never
    // wait on the API. No receipt card is posted for a send.
    await interaction.deferUpdate();

    const count = interaction.customId.startsWith('spamraid_burst:') ? burst : 1;

    enqueue(interaction.channel.id, () => sendBatch(interaction.channel, text, mode, count))
      .catch(err => {
        logger.error('[spamraid] send failed:', err);
        return interaction.followUp({
          embeds: [errorEmbed(`Send failed: ${err.message}`)],
          flags: MessageFlags.Ephemeral
        }).catch(() => {});
      });
  },

  async handleModal(interaction) {
    if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        embeds: [errorEmbed('You need Manage Server to send from this panel.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const { mode } = parseId(interaction.customId);
    const text = interaction.fields.getTextInputValue('promo_text').trim();

    if (!text) {
      return interaction.reply({
        embeds: [errorEmbed('Give me a message to send.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferUpdate();

    enqueue(interaction.channel.id, () => sendBatch(interaction.channel, text, mode, 1))
      .catch(err => {
        logger.error('[spamraid] custom send failed:', err);
        return interaction.followUp({
          embeds: [errorEmbed(`Send failed: ${err.message}`)],
          flags: MessageFlags.Ephemeral
        }).catch(() => {});
      });
  }
};
