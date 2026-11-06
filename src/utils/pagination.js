const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { createEmbed, errorEmbed, infoEmbed } = require('./embeds');

const SESSION_TTL_MS = 10 * 60 * 1000;
const sessions = new Map();

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function cleanup() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(id);
  }
}

/**
 * Registers a paginated panel and returns its session id.
 * `pages` is an array of embed option objects ({ title, description, fields }).
 */
function createPaginator({ authorId, pages, color, footerLabel }) {
  cleanup();
  const id = randomId();
  sessions.set(id, {
    authorId,
    pages,
    color,
    footerLabel,
    createdAt: Date.now()
  });
  return id;
}

function controlRow(id, page, total) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`onyx_page:${id}:${page - 1}`)
      .setLabel('Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`onyx_page:${id}:${page}`)
      .setLabel(`${page + 1} / ${total}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`onyx_page:${id}:${page + 1}`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= total - 1),
    new ButtonBuilder()
      .setCustomId(`onyx_close:${id}`)
      .setLabel('Close')
      .setStyle(ButtonStyle.Danger)
  );
}

/**
 * Builds the render payload for a page of a registered session.
 */
function paginatorPayload(id, requestedPage = 0) {
  const session = sessions.get(id);
  if (!session) return null;

  const total = session.pages.length;
  const page = Math.max(0, Math.min(Number(requestedPage) || 0, total - 1));
  const spec = session.pages[page] || {};
  const footerText = [
    session.footerLabel,
    `Page ${page + 1} of ${total}`
  ].filter(Boolean).join(' · ');

  const embed = createEmbed({
    ...spec,
    color: spec.color || session.color,
    footer: { text: footerText }
  });

  return {
    embeds: [embed],
    components: total > 1 ? [controlRow(id, page, total)] : []
  };
}

/**
 * Convenience helper: create the session and return the first payload.
 */
function paginatedReply({ authorId, pages, color, footerLabel }) {
  const id = createPaginator({ authorId, pages, color, footerLabel });
  return { id, payload: paginatorPayload(id, 0) };
}

/**
 * Handles page/close buttons. Returns true when the interaction was consumed.
 */
async function handlePagination(interaction) {
  const { customId } = interaction;
  if (!customId.startsWith('onyx_page:') && !customId.startsWith('onyx_close:')) return false;

  const [, id, page] = customId.split(':');
  const session = sessions.get(id);
  const expired = session && Date.now() - session.createdAt > SESSION_TTL_MS;

  if (!session || expired) {
    if (session) sessions.delete(id);
    await interaction.reply({
      embeds: [errorEmbed('This panel has expired. Run the command again to reopen it.')],
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
    return true;
  }

  if (session.authorId && interaction.user.id !== session.authorId) {
    await interaction.reply({
      embeds: [errorEmbed('This panel belongs to another user. Run the command yourself to browse it.')],
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
    return true;
  }

  if (customId.startsWith('onyx_close:')) {
    sessions.delete(id);
    await interaction.update({
      embeds: [infoEmbed('Panel closed.')],
      components: []
    }).catch(() => {});
    return true;
  }

  const payload = paginatorPayload(id, page);
  if (!payload) return true;

  await interaction.update(payload).catch(() => {});
  return true;
}

module.exports = {
  createPaginator,
  paginatorPayload,
  paginatedReply,
  handlePagination
};
