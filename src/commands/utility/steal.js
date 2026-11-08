const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../../../config.json');
const { actionEmbed, errorEmbed } = require('../../utils/embeds');

const EMOJI_MARKUP = /<a?:([a-zA-Z0-9_]{2,32}):(\d{17,20})>/;
const EMOJI_LINK = /(?:cdn|media)\.discordapp\.(?:com|net)\/emojis\/(\d{17,20})\.(png|gif|webp)/i;
const STICKER_LINK = /(?:cdn|media)\.discordapp\.(?:com|net)\/stickers\/(\d{17,20})\.(png|apng|gif|json)/i;
const SNOWFLAKE = /^\d{17,20}$/;
const EMOJI_LIMIT = 256 * 1024;
const STICKER_LIMIT = 512 * 1024;

function cleanName(raw, maxLength) {
  const name = String(raw || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLength);

  return name.length >= 2 ? name : 'stolen';
}

function emojiInput(input) {
  const markup = input.match(EMOJI_MARKUP);
  if (markup) {
    return {
      id: markup[2],
      animated: markup[0].startsWith('<a:'),
      name: markup[1]
    };
  }

  const link = input.match(EMOJI_LINK);
  if (link) {
    return {
      id: link[1],
      animated: link[2].toLowerCase() === 'gif',
      name: null
    };
  }

  const bare = input.trim().replace(/^emoji:/i, '');
  if (SNOWFLAKE.test(bare)) {
    return { id: bare, animated: false, name: null };
  }

  return null;
}

function stickerInput(input) {
  const bare = input.trim().replace(/^sticker:/i, '');
  const link = bare.match(STICKER_LINK);

  if (link) {
    const extension = link[2].toLowerCase() === 'json' ? 'png' : link[2].toLowerCase();
    return {
      id: link[1],
      url: `https://cdn.discordapp.com/stickers/${link[1]}.${extension}`,
      name: null
    };
  }

  if (SNOWFLAKE.test(bare)) {
    return {
      id: bare,
      url: `https://cdn.discordapp.com/stickers/${bare}.png`,
      name: null
    };
  }

  return null;
}

function stickerSource(sticker) {
  return {
    url: sticker.url?.replace(/\.json$/i, '.png'),
    name: sticker.name,
    tags: sticker.tags || 'stolen',
    description: sticker.description || null
  };
}

async function resolveSticker(client, reference) {
  const sticker = await client.fetchSticker(reference.id).catch(() => null);

  return {
    url: sticker?.url?.replace(/\.json$/i, '.png') || reference.url,
    name: sticker?.name || reference.name,
    tags: sticker?.tags || 'stolen',
    description: sticker?.description || null
  };
}

async function download(url) {
  if (!url) throw new Error('Could not find an image to copy.');

  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Download failed (${response.status}).`);

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    type: (response.headers.get('content-type') || '').toLowerCase()
  };
}

async function stealEmoji(guild, source, name, moderator) {
  let image;

  if (source.attachment) {
    image = await download(source.attachment.url);
    if (image.type && !image.type.startsWith('image/')) {
      throw new Error('That attachment is not an image.');
    }
  } else {
    const extension = source.animated ? 'gif' : 'png';
    image = await download(`https://cdn.discordapp.com/emojis/${source.id}.${extension}?size=128`);
  }

  if (image.buffer.length > EMOJI_LIMIT) {
    throw new Error('The emoji is larger than 256 KB.');
  }

  const emoji = await guild.emojis.create({
    attachment: image.buffer,
    name: cleanName(name || source.name || `emoji_${source.id.slice(-4)}`, 32),
    reason: `[Onyx Steal] by ${moderator.id}`
  });

  return actionEmbed({
    title: 'Emoji Stolen',
    moderator: `<@${moderator.id}>`,
    description: `${emoji} added as **:${emoji.name}:**`,
    fields: [
      { name: 'Type', value: emoji.animated ? 'Animated emoji' : 'Emoji', inline: true },
      { name: 'Server', value: guild.name, inline: true }
    ],
    color: config.colors.success
  });
}

async function stealSticker(guild, source, name, moderator) {
  const image = await download(source.url);

  if (image.type.includes('json')) {
    throw new Error('This sticker cannot be copied.');
  }
  if (image.type && !image.type.startsWith('image/')) {
    throw new Error('That link is not a sticker image.');
  }
  if (image.buffer.length > STICKER_LIMIT) {
    throw new Error('The sticker is larger than 512 KB.');
  }

  const sticker = await guild.stickers.create({
    file: image.buffer,
    name: cleanName(name || source.name || `sticker_${source.url.slice(-10)}`, 30),
    tags: String(source.tags || 'stolen').slice(0, 200),
    description: source.description ? String(source.description).slice(0, 200) : undefined,
    reason: `[Onyx Steal] by ${moderator.id}`
  });

  return actionEmbed({
    title: 'Sticker Stolen',
    moderator: `<@${moderator.id}>`,
    description: `**${sticker.name}** added to the sticker picker.`,
    fields: [
      { name: 'Type', value: 'Sticker', inline: true },
      { name: 'Tags', value: sticker.tags || '—', inline: true },
      { name: 'Server', value: guild.name, inline: true }
    ],
    color: config.colors.success
  });
}

function friendlyError(err, kind) {
  const message = err?.message || 'Unknown error';

  if (/maximum number of emojis/i.test(message)) return 'This server has no free emoji slots.';
  if (/maximum number of stickers/i.test(message)) return 'This server has no free sticker slots.';
  if (/boost|tier/i.test(message)) return 'This server needs a higher boost level for another sticker.';
  if (/animated/i.test(message)) return 'Animated emojis need a higher boost level.';
  if (/missing.*permission|missing access/i.test(message)) {
    return 'I need Manage Expressions and a role that can manage server emojis and stickers.';
  }
  if (/invalid asset|image|file/i.test(message)) {
    return `Discord rejected the ${kind} image. Use a PNG, GIF, or WEBP within the size limit.`;
  }

  return message;
}

// Resolves what a prefix invocation points at: an explicit sticker, a sticker
// or emoji on the replied message, an emoji in the arguments, or an attachment.
async function prefixSource(message, args, client) {
  const first = (args[0] || '').toLowerCase();

  if (first === 'sticker') {
    const reference = stickerInput(args.slice(1).join(' '));
    if (!reference) throw new Error('Provide a sticker ID or sticker CDN link after `sticker`.');
    return { kind: 'sticker', source: await resolveSticker(client, reference) };
  }

  if (first === 'emoji') {
    const reference = emojiInput(args.slice(1).join(' '));
    if (!reference) throw new Error('Provide an emoji, emoji ID, or emoji CDN link after `emoji`.');
    return { kind: 'emoji', source: reference };
  }

  const ownSticker = message.stickers?.first();
  if (ownSticker) return { kind: 'sticker', source: stickerSource(ownSticker) };

  if (message.reference?.messageId) {
    const referenced = await message.fetchReference().catch(() => null);
    const sticker = referenced?.stickers?.first();
    if (sticker) return { kind: 'sticker', source: stickerSource(sticker) };

    if (referenced?.content) {
      const stickerRef = stickerInput(referenced.content);
      if (stickerRef && STICKER_LINK.test(referenced.content)) {
        return { kind: 'sticker', source: await resolveSticker(client, stickerRef) };
      }

      const emojiRef = emojiInput(referenced.content);
      if (emojiRef) return { kind: 'emoji', source: emojiRef };
    }
  }

  const joined = args.join(' ').trim();
  const stickerRef = stickerInput(joined);
  if (stickerRef && STICKER_LINK.test(joined)) {
    return { kind: 'sticker', source: await resolveSticker(client, stickerRef) };
  }

  // A bare ID is tried as a sticker first, then as an emoji.
  if (SNOWFLAKE.test(joined)) {
    const resolved = await resolveSticker(client, stickerInput(joined));
    if (resolved.name) return { kind: 'sticker', source: resolved };
    return { kind: 'emoji', source: emojiInput(joined) };
  }

  const emojiRef = emojiInput(joined);
  if (emojiRef) return { kind: 'emoji', source: emojiRef };

  const attachment = message.attachments?.first();
  if (attachment) {
    return {
      kind: 'emoji',
      source: { attachment, name: args[0] || attachment.name, id: attachment.id }
    };
  }

  return null;
}

function usage(prefix) {
  return [
    `Usage: \`${prefix}steal <:emoji:123>\``,
    `Reply to an emoji or sticker with \`${prefix}steal\``,
    `\`${prefix}steal sticker <id|link>\` or \`${prefix}steal emoji <id|link>\``
  ].join('\n');
}

module.exports = {
  name: 'steal',
  description: 'Copies an emoji or sticker into this server.',
  userPermissions: [PermissionFlagsBits.ManageGuildExpressions],
  botPermissions: [PermissionFlagsBits.ManageGuildExpressions],
  data: new SlashCommandBuilder()
    .setName('steal')
    .setDescription('Copies an emoji or sticker into this server.')
    .addStringOption(option =>
      option.setName('emoji')
        .setDescription('Custom emoji, emoji ID, or emoji CDN link')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('sticker')
        .setDescription('Sticker ID or sticker CDN link')
        .setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName('file')
        .setDescription('Image to add as an emoji')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Optional name for the copied emoji or sticker')
        .setMaxLength(32)
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    const emoji = interaction.options.getString('emoji');
    const sticker = interaction.options.getString('sticker');
    const file = interaction.options.getAttachment('file');
    const name = interaction.options.getString('name');

    if (!emoji && !sticker && !file) {
      return interaction.reply({
        embeds: [errorEmbed('Give me an emoji, a sticker, or an image attachment to copy.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      let embed;

      if (sticker) {
        const reference = stickerInput(sticker);
        if (!reference) throw new Error('That sticker ID or link is not valid.');
        embed = await stealSticker(
          interaction.guild,
          await resolveSticker(interaction.client, reference),
          name,
          interaction.user
        );
      } else if (emoji) {
        const reference = emojiInput(emoji);
        if (!reference) throw new Error('That emoji or link is not valid.');
        embed = await stealEmoji(interaction.guild, reference, name, interaction.user);
      } else {
        if (file.contentType && !file.contentType.startsWith('image/')) {
          throw new Error('That attachment is not an image.');
        }
        embed = await stealEmoji(
          interaction.guild,
          { attachment: file, name: name || file.name, id: file.id },
          name,
          interaction.user
        );
      }

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      return interaction.editReply({ embeds: [errorEmbed(friendlyError(err, sticker ? 'sticker' : 'emoji'))] });
    }
  },

  async executePrefix(message, args, client, prefix = '!') {
    try {
      const found = await prefixSource(message, args, client);
      if (!found) {
        return message.reply({ embeds: [errorEmbed(usage(prefix))] });
      }

      const embed = found.kind === 'sticker'
        ? await stealSticker(message.guild, found.source, null, message.author)
        : await stealEmoji(message.guild, found.source, null, message.author);

      return message.reply({ embeds: [embed] });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed(friendlyError(err, args[0]?.toLowerCase() === 'sticker' ? 'sticker' : 'emoji'))] });
    }
  }
};
