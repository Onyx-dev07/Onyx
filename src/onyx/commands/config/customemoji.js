const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const config = require('../../../config.json');
const { securityEmbed, errorEmbed, muted, mark, UI } = require('../../utils/embeds');
const emojiConfig = require('../../utils/emojiConfig');

const KNOWN_SLOTS = ['roleAdd', 'roleRemove'];

function isBotOwner(userId) {
  const owners = String(process.env.OWNER_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);
  return owners.includes(String(userId));
}

function ownerDenied() {
  return {
    embeds: [errorEmbed('Only the bot owner can manage the emoji server connection.')],
  };
}

function listPayload() {
  const stored = emojiConfig.getEmojiConfig();
  const emojiCount = Object.keys(stored.emojis).length;
  const active = Boolean(stored.sourceGuildId && emojiCount);

  const slotLines = KNOWN_SLOTS.map(slot => {
    const raw = stored.slots[slot];
    const resolved = emojiConfig.resolveEmoji(slot, '➕');
    return `${mark(Boolean(raw))} \`${slot}\` ${UI.separator} ${raw ? `${raw} ${resolved}` : 'not set'}`;
  });

  const sample = Object.entries(stored.emojis).slice(0, 12)
    .map(([name, token]) => `${name} ${token}`);

  return {
    embeds: [securityEmbed({
      title: 'Emoji server',
      description: [
        `${mark(active)} **Source** ${UI.separator} ${stored.sourceGuildName ? `${stored.sourceGuildName} (\`${stored.sourceGuildId}\`)` : 'not connected'}`,
        `${mark(active)} **Synced emojis** ${UI.separator} ${emojiCount}`,
        stored.syncedAt ? `${mark(true)} **Last sync** ${UI.separator} <t:${Math.floor(Date.parse(stored.syncedAt) / 1000)}:R>` : '',
        '',
        '**Slot mapping**',
        ...slotLines,
        sample.length ? ['', '**Synced emoji**', ...sample] : [],
        '',
        muted(`Edit ${emojiConfig.CONFIG_FILE} to map slots manually, or use \`!cx set <slot> <emoji>\`.`),
      ].flat().filter(Boolean).join('\n'),
      color: active ? config.colors.success : config.colors.info,
      footer: { text: 'Custom emoji' },
    })],
  };
}

function simplePayload(title, description, ok = true) {
  return {
    embeds: [securityEmbed({
      title,
      description,
      color: ok ? config.colors.success : config.colors.error,
      footer: { text: 'Custom emoji' },
    })],
  };
}

function errorPayload(error) {
  return { embeds: [errorEmbed(error)] };
}

async function handle(sub, params, client) {
  if (sub === 'add') {
    const result = await emojiConfig.syncFromGuild(client, params.guildId);
    if (result.error) return errorPayload(result.error);
    return simplePayload(
      'Emoji server connected',
      [
        `Synced **${result.count}** emoji from **${result.guild.name}**.`,
        '',
        Object.entries(result.emojis).slice(0, 12)
          .map(([name, token]) => `${name} ${token}`).join('\n'),
        '',
        muted(`Map a slot with \`!cx set roleAdd ${Object.keys(result.emojis)[0]}\`.`),
      ].join('\n'),
    );
  }

  if (sub === 'sync') {
    const stored = emojiConfig.getEmojiConfig();
    if (!stored.sourceGuildId) {
      return errorPayload('No emoji server is connected. Run `!cx add <server id>` first.');
    }
    return handle('add', { guildId: stored.sourceGuildId }, client);
  }

  if (sub === 'set') {
    const result = emojiConfig.setSlot(params.slot, params.emoji);
    if (result.error) return errorPayload(result.error);
    return simplePayload(
      'Slot updated',
      `\`${params.slot}\` now uses ${result.resolved}.\n\n${muted('Edit data/emojiConfig.json at any time to change mappings by hand.')}`,
    );
  }

  if (sub === 'clear') {
    const result = emojiConfig.clearConfig();
    if (result.error) return errorPayload(result.error);
    return simplePayload('Emoji server disconnected', 'The synced emoji list and slot mappings were cleared.');
  }

  return listPayload();
}

module.exports = {
  name: 'cx',
  aliases: ['customemoji', 'emojisync'],
  description: 'Connect an emoji server and map its custom emojis to bot actions.',
  userPermissions: [PermissionFlagsBits.Administrator],
  data: new SlashCommandBuilder()
    .setName('cx')
    .setDescription('Connect an emoji server and map its custom emojis to bot actions.')
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Connect and sync an emoji server the bot is already in')
      .addStringOption(opt => opt
        .setName('server_id')
        .setDescription('ID of the server that holds the emojis')
        .setRequired(true)))
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('Show the connected server, synced emojis, and slot mappings'))
    .addSubcommand(sub => sub
      .setName('set')
      .setDescription('Map an emoji to a bot action')
      .addStringOption(opt => opt
        .setName('slot')
        .setDescription('Action slot to configure')
        .setRequired(true)
        .addChoices(...KNOWN_SLOTS.map(slot => ({ name: slot, value: slot }))))
      .addStringOption(opt => opt
        .setName('emoji')
        .setDescription('Emoji name from the synced server, or a raw <:name:id> token')
        .setRequired(true)))
    .addSubcommand(sub => sub
      .setName('sync')
      .setDescription('Re-sync emojis from the connected server'))
    .addSubcommand(sub => sub
      .setName('clear')
      .setDescription('Disconnect the emoji server and clear all mappings')),

  async executeSlash(interaction) {
    if (!isBotOwner(interaction.user.id)) {
      return interaction.reply({ ...ownerDenied(), flags: MessageFlags.Ephemeral });
    }

    const sub = interaction.options.getSubcommand();
    const params = {
      guildId: interaction.options.getString('server_id'),
      slot: interaction.options.getString('slot'),
      emoji: interaction.options.getString('emoji'),
    };

    return interaction.reply({ ...(await handle(sub, params, interaction.client)), flags: MessageFlags.Ephemeral });
  },

  async executePrefix(message, args) {
    if (!isBotOwner(message.author.id)) return message.reply(ownerDenied());

    const sub = (args[0] || 'list').toLowerCase();
    const params = {
      guildId: args[1],
      slot: args[1],
      emoji: args[2],
    };

    return message.reply(await handle(sub, params, message.client));
  },
};
