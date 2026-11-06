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
const { createEmbed, errorEmbed, receiptEmbed, UI } = require('../../utils/embeds');

const MODE_LABEL = {
  webhook: 'Webhook',
  message: 'Bot message'
};

function modeFrom(customId) {
  return customId.split(':')[1] === 'message' ? 'message' : 'webhook';
}

// One webhook per channel, reused for every click and removed after ten idle
// minutes, so repeated sends stay fast without leaving a sender behind.
const WEBHOOK_NAME = 'Onyx Spam';
const LEGACY_WEBHOOK_NAMES = ['Onyx Promo'];
const WEBHOOK_IDLE_MS = 10 * 60 * 1000;
const hooks = new Map();

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

function panelEmbed(text, mode) {
  return createEmbed({
    title: 'Spam',
    description: text,
    footer: { text: `Click Send to post this again · ${MODE_LABEL[mode]}` }
  });
}

function panelPayload(text, mode) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`spamraid_send:${mode}`)
      .setLabel('Send')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`spamraid_custom:${mode}`)
      .setLabel('Custom message')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [panelEmbed(text, mode)], components: [row] };
}

async function post(interaction, channel, text, mode) {
  const panel = await channel.send(panelPayload(text, mode));

  return interaction.reply({
    embeds: [receiptEmbed({
      headline: 'Spam panel deployed',
      lines: [
        `Channel ${UI.separator} <#${channel.id}>`,
        `Mode ${UI.separator} ${MODE_LABEL[mode]}`
      ],
      hint: `${panel.url ? `Panel ${panel.url} · ` : ''}Click Send to post, or Custom message for your own text.`,
      source: 'SpamRaid'
    })],
    flags: MessageFlags.Ephemeral
  });
}

function usage(prefix) {
  return `${prefix}spamraid [webhook] <text> ${UI.separator} posts the spam panel`;
}

module.exports = {
  name: 'spamraid',
  aliases: ['promo', 'promobroadcast'],
  description: 'Posts a click-to-send spam panel with webhook and custom message buttons.',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('spamraid')
    .setDescription('Posts a click-to-send spam panel with webhook and custom message buttons.')
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
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel to post the panel in (defaults to this one)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    const text = interaction.options.getString('message').trim();
    const mode = interaction.options.getString('mode') || 'webhook';
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    if (!channel?.isTextBased?.()) {
      return interaction.reply({
        embeds: [errorEmbed('Pick a text channel for the spam panel.')],
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      await post(interaction, channel, text, mode);
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

    if (rest[0]?.toLowerCase() === 'webhook' || rest[0]?.toLowerCase() === 'message') {
      mode = rest.shift().toLowerCase();
    }

    const text = rest.join(' ').trim();
    if (!text) {
      const prefix = db.getPrefix(message.guild.id, process.env.DEFAULT_PREFIX || config.defaultPrefix || '!');
      return message.reply({ embeds: [errorEmbed(`Give me text to send.\n${usage(prefix)}`)] });
    }

    try {
      const panel = await message.channel.send(panelPayload(text, mode));
      await message.reply({
        embeds: [receiptEmbed({
          headline: 'Spam panel deployed',
          lines: [
            `Channel ${UI.separator} <#${message.channel.id}>`,
            `Mode ${UI.separator} ${MODE_LABEL[mode]}`
          ],
          hint: `Click Send on the panel to post${panel?.url ? ` ${panel.url}` : ''}.`,
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

    const mode = modeFrom(interaction.customId);

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

    const text = interaction.message.embeds[0]?.description;
    if (!text) {
      return interaction.reply({
        embeds: [errorEmbed('This panel lost its message text. Run `/spamraid` again.')],
        flags: MessageFlags.Ephemeral
      });
    }

    // Acknowledge the click without posting a receipt card. The only visible
    // result should be the message itself.
    await interaction.deferUpdate();

    try {
      await sendOnce(interaction.channel, text, mode);
    } catch (err) {
      return interaction.followUp({
        embeds: [errorEmbed(`Send failed: ${err.message}`)],
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }
  },

  async handleModal(interaction) {
    if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        embeds: [errorEmbed('You need Manage Server to send from this panel.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const mode = modeFrom(interaction.customId);
    const text = interaction.fields.getTextInputValue('promo_text').trim();

    if (!text) {
      return interaction.reply({
        embeds: [errorEmbed('Give me a message to send.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferUpdate();

    try {
      await sendOnce(interaction.channel, text, mode);
    } catch (err) {
      return interaction.followUp({
        embeds: [errorEmbed(`Send failed: ${err.message}`)],
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }
  }
};
