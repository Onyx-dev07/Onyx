// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  PermissionsBitField,
  MessageFlags
} = require('discord.js');
const {
  getSession,
  deleteSession,
  buildBuilderMessage,
  buildPreviewContainer,
  parseHexColor,
  isHttpUrl
} = require('../../lib/containerBuilderState');

const PREFIX = 'cb_';

function ownsSession(interaction, session) {
  return session && session.userId === interaction.user.id;
}

async function notYours(interaction) {
  return interaction.reply({
    content: 'This builder belongs to someone else.',
    flags: MessageFlags.Ephemeral
  });
}

async function sessionGone(interaction) {
  return interaction.reply({
    content: 'This builder session has expired. Run the command again.',
    flags: MessageFlags.Ephemeral
  });
}

async function refresh(interaction, session) {
  return interaction.update(buildBuilderMessage(session));
}

function parseId(customId) {
  if (!customId.startsWith(PREFIX)) return null;
  const rest = customId.slice(PREFIX.length);
  const idx = rest.indexOf('_');
  if (idx === -1) return null;
  return { action: rest.slice(0, idx), sessionId: rest.slice(idx + 1) };
}

function buildAddModal(action, sessionId) {
  switch (action) {
    case 'text': {
      return new ModalBuilder()
        .setCustomId(`${PREFIX}modal_text_new_${sessionId}`)
        .setTitle('Add Text Display')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('content')
              .setLabel('Content (markdown supported)')
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(4000)
              .setRequired(true)
          )
        );
    }
    case 'section': {
      return new ModalBuilder()
        .setCustomId(`${PREFIX}modal_section_new_${sessionId}`)
        .setTitle('Add Section with Thumbnail')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('content')
              .setLabel('Section text')
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(2000)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('thumb')
              .setLabel('Thumbnail image URL (https://...)')
              .setStyle(TextInputStyle.Short)
              .setMaxLength(500)
              .setRequired(false)
          )
        );
    }
    case 'media': {
      return new ModalBuilder()
        .setCustomId(`${PREFIX}modal_media_new_${sessionId}`)
        .setTitle('Add Media Gallery')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('items')
              .setLabel('Image URLs (one per line, max 10)')
              .setPlaceholder('https://...\nhttps://...\nhttps://...')
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(4000)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('descriptions')
              .setLabel('Descriptions (one per line, optional)')
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(2000)
              .setRequired(false)
          )
        );
    }
    case 'buttons': {
      return new ModalBuilder()
        .setCustomId(`${PREFIX}modal_buttons_new_${sessionId}`)
        .setTitle('Add Link Buttons Row')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('buttons')
              .setLabel('Buttons: Label | URL (one per line, max 5)')
              .setPlaceholder('Website | https://example.com\nDocs | https://docs.example.com')
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(2000)
              .setRequired(true)
          )
        );
    }
    default:
      return null;
  }
}

function buildEditModal(block, index, sessionId) {
  switch (block.type) {
    case 'text': {
      return new ModalBuilder()
        .setCustomId(`${PREFIX}modal_text_edit_${index}_${sessionId}`)
        .setTitle(`Edit Text Display #${index + 1}`)
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('content')
              .setLabel('Content (markdown supported)')
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(4000)
              .setValue(block.content || '')
              .setRequired(true)
          )
        );
    }
    case 'section': {
      const modal = new ModalBuilder()
        .setCustomId(`${PREFIX}modal_section_edit_${index}_${sessionId}`)
        .setTitle(`Edit Section #${index + 1}`)
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('content')
              .setLabel('Section text')
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(2000)
              .setValue(block.content || '')
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('thumb')
              .setLabel('Thumbnail image URL (https://...)')
              .setStyle(TextInputStyle.Short)
              .setMaxLength(500)
              .setValue(block.thumbnailUrl || '')
              .setRequired(false)
          )
        );
      return modal;
    }
    case 'media': {
      const urls = block.items.map(i => i.url).join('\n');
      const descs = block.items.map(i => i.description || '').join('\n');
      return new ModalBuilder()
        .setCustomId(`${PREFIX}modal_media_edit_${index}_${sessionId}`)
        .setTitle(`Edit Media Gallery #${index + 1}`)
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('items')
              .setLabel('Image URLs (one per line, max 10)')
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(4000)
              .setValue(urls)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('descriptions')
              .setLabel('Descriptions (one per line, optional)')
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(2000)
              .setValue(descs)
              .setRequired(false)
          )
        );
    }
    case 'buttons': {
      const value = block.buttons.map(b => `${b.label} | ${b.url}`).join('\n');
      return new ModalBuilder()
        .setCustomId(`${PREFIX}modal_buttons_edit_${index}_${sessionId}`)
        .setTitle(`Edit Buttons Row #${index + 1}`)
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('buttons')
              .setLabel('Buttons: Label | URL (one per line, max 5)')
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(2000)
              .setValue(value)
              .setRequired(true)
          )
        );
    }
    default:
      return null;
  }
}

function parseMediaItems(itemsRaw, descsRaw) {
  const urls = (itemsRaw || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 10);
  const descs = (descsRaw || '').split('\n').map(s => s.trim());
  return urls
    .filter(u => isHttpUrl(u))
    .map((url, i) => ({ url, description: descs[i] || '' }));
}

function parseButtons(raw) {
  return (raw || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map(line => {
      const idx = line.indexOf('|');
      if (idx === -1) return null;
      const label = line.slice(0, idx).trim();
      const url = line.slice(idx + 1).trim();
      if (!label || !isHttpUrl(url)) return null;
      return { label, url };
    })
    .filter(Boolean);
}

async function showSeparatorPicker(interaction, session) {
  const sid = session.id;
  const container = new ContainerBuilder().setAccentColor(0x2B2D31)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Add Separator'))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('Choose spacing and divider style:'))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`${PREFIX}sepadd_small_div_${sid}`)
          .setLabel('Small + Divider')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`${PREFIX}sepadd_small_nodiv_${sid}`)
          .setLabel('Small (no divider)')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`${PREFIX}sepadd_large_div_${sid}`)
          .setLabel('Large + Divider')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`${PREFIX}sepadd_large_nodiv_${sid}`)
          .setLabel('Large (no divider)')
          .setStyle(ButtonStyle.Secondary)
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`${PREFIX}sepadd_cancel_${sid}`)
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Danger)
      )
    );

  return interaction.update({
    components: [buildPreviewContainer(session), container],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
  });
}

async function showSeparatorEditor(interaction, session, index) {
  const sid = session.id;
  const block = session.blocks[index];
  if (!block || block.type !== 'separator') return refresh(interaction, session);

  const container = new ContainerBuilder().setAccentColor(0x2B2D31)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Edit Separator #${index + 1}`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `Current: \`${block.spacing}\` ${block.divider ? 'with divider' : 'no divider'}`
    ))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`${PREFIX}sepedit_small_div_${index}_${sid}`)
          .setLabel('Small + Divider')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`${PREFIX}sepedit_small_nodiv_${index}_${sid}`)
          .setLabel('Small (no divider)')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`${PREFIX}sepedit_large_div_${index}_${sid}`)
          .setLabel('Large + Divider')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`${PREFIX}sepedit_large_nodiv_${index}_${sid}`)
          .setLabel('Large (no divider)')
          .setStyle(ButtonStyle.Secondary)
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`${PREFIX}sepedit_cancel_${sid}`)
          .setLabel('Back')
          .setStyle(ButtonStyle.Danger)
      )
    );

  return interaction.update({
    components: [buildPreviewContainer(session), container],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
  });
}

async function handle(interaction) {
  const customId = interaction.customId;
  if (!customId || !customId.startsWith(PREFIX)) return false;

  if (interaction.isModalSubmit()) {
    return handleModal(interaction);
  }

  if (customId.startsWith(`${PREFIX}sepadd_`) || customId.startsWith(`${PREFIX}sepedit_`)) {
    return handleSeparatorButtons(interaction);
  }

  const parsed = parseId(customId);
  if (!parsed) return false;

  const session = getSession(parsed.sessionId);
  if (!session) { await sessionGone(interaction); return true; }
  if (!ownsSession(interaction, session)) { await notYours(interaction); return true; }

  if (interaction.isStringSelectMenu()) {
    if (parsed.action === 'colorpick') {
      const choice = interaction.values[0];
      if (choice === 'none') {
        session.accentColor = null;
        await refresh(interaction, session);
        return true;
      }
      if (choice === 'custom') {
        const currentHex = (session.accentColor === null || session.accentColor === undefined)
          ? ''
          : '#' + session.accentColor.toString(16).padStart(6, '0').toUpperCase();
        const modal = new ModalBuilder()
          .setCustomId(`${PREFIX}modal_color_set_${session.id}`)
          .setTitle('Set Accent Color')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('hex')
                .setLabel('Hex color (e.g. 5865F2 or #5865F2)')
                .setStyle(TextInputStyle.Short)
                .setMaxLength(7)
                .setValue(currentHex)
                .setRequired(true)
            )
          );
        await interaction.showModal(modal);
        return true;
      }
      await refresh(interaction, session);
      return true;
    }
    if (parsed.action === 'add') {
      const type = interaction.values[0];
      if (type === 'separator') {
        await showSeparatorPicker(interaction, session);
        return true;
      }
      const modal = buildAddModal(type, session.id);
      if (modal) {
        await interaction.showModal(modal);
        return true;
      }
      return true;
    }
    if (parsed.action === 'select') {
      session.selectedBlockIndex = parseInt(interaction.values[0], 10);
      await refresh(interaction, session);
      return true;
    }
  }

  if (interaction.isChannelSelectMenu()) {
    if (parsed.action === 'channel') {
      session.targetChannelId = interaction.values[0];
      await refresh(interaction, session);
      return true;
    }
  }

  if (interaction.isButton()) {
    if (parsed.action === 'colorback') {
      await refresh(interaction, session);
      return true;
    }
    return handleButton(interaction, session, parsed.action);
  }

  return false;
}

async function handleButton(interaction, session, action) {
  switch (action) {
    case 'edit': {
      const idx = session.selectedBlockIndex;
      if (idx === null || idx < 0 || idx >= session.blocks.length) {
        await refresh(interaction, session);
        return true;
      }
      const block = session.blocks[idx];
      if (block.type === 'separator') {
        await showSeparatorEditor(interaction, session, idx);
        return true;
      }
      const modal = buildEditModal(block, idx, session.id);
      if (modal) {
        await interaction.showModal(modal);
        return true;
      }
      await refresh(interaction, session);
      return true;
    }
    case 'up': {
      const idx = session.selectedBlockIndex;
      if (idx > 0 && idx < session.blocks.length) {
        const tmp = session.blocks[idx - 1];
        session.blocks[idx - 1] = session.blocks[idx];
        session.blocks[idx] = tmp;
        session.selectedBlockIndex = idx - 1;
      }
      await refresh(interaction, session);
      return true;
    }
    case 'down': {
      const idx = session.selectedBlockIndex;
      if (idx >= 0 && idx < session.blocks.length - 1) {
        const tmp = session.blocks[idx + 1];
        session.blocks[idx + 1] = session.blocks[idx];
        session.blocks[idx] = tmp;
        session.selectedBlockIndex = idx + 1;
      }
      await refresh(interaction, session);
      return true;
    }
    case 'remove': {
      const idx = session.selectedBlockIndex;
      if (idx >= 0 && idx < session.blocks.length) {
        session.blocks.splice(idx, 1);
        session.selectedBlockIndex = null;
      }
      await refresh(interaction, session);
      return true;
    }
    case 'reset': {
      session.blocks = [];
      session.selectedBlockIndex = null;
      session.accentColor = 0xFFFFFF;
      session.targetChannelId = null;
      await refresh(interaction, session);
      return true;
    }
    case 'cancel': {
      deleteSession(session.id);
      const goodbye = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Container builder cancelled.'));
      await interaction.update({
        components: [goodbye],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
      return true;
    }
    case 'color': {
      const pickerContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Set Accent Color'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Choose an option:'))
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`${PREFIX}colorpick_${session.id}`)
              .setPlaceholder('Choose color option')
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Custom Color').setDescription('Enter a custom hex color code').setValue('custom'),
                new StringSelectMenuOptionBuilder().setLabel('None').setDescription('Remove accent color').setValue('none')
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`${PREFIX}colorback_${session.id}`)
              .setLabel('Back')
              .setStyle(ButtonStyle.Danger)
          )
        );
      await interaction.update({
        components: [buildPreviewContainer(session), pickerContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
      return true;
    }
    case 'send': {
      return handleSend(interaction, session);
    }
  }
  return false;
}

async function handleSend(interaction, session) {
  if (session.blocks.length === 0) {
    return interaction.reply({
      content: 'Add at least one component before sending.',
      flags: MessageFlags.Ephemeral
    });
  }
  if (!session.targetChannelId) {
    return interaction.reply({
      content: 'Pick a target channel first.',
      flags: MessageFlags.Ephemeral
    });
  }

  const channel = interaction.guild.channels.cache.get(session.targetChannelId)
    || await interaction.guild.channels.fetch(session.targetChannelId).catch(() => null);

  if (!channel) {
    return interaction.reply({
      content: 'Target channel not found anymore.',
      flags: MessageFlags.Ephemeral
    });
  }

  const me = interaction.guild.members.me;
  if (!channel.permissionsFor(me)?.has(PermissionsBitField.Flags.SendMessages | PermissionsBitField.Flags.ViewChannel)) {
    return interaction.reply({
      content: `I don't have permission to send messages in <#${channel.id}>.`,
      flags: MessageFlags.Ephemeral
    });
  }

  try {
    const preview = buildPreviewContainer(session);
    await channel.send({
      components: [preview],
      flags: MessageFlags.IsComponentsV2
    });

    deleteSession(session.id);
    const done = new ContainerBuilder().setAccentColor(session.accentColor)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `Container sent to <#${channel.id}>.`
      ));
    return interaction.update({
      components: [done],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
  } catch (err) {
    return interaction.reply({
      content: `Failed to send container: ${err.message}`,
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleSeparatorButtons(interaction) {
  const customId = interaction.customId;
  const isEdit = customId.startsWith(`${PREFIX}sepedit_`);
  const isAdd = customId.startsWith(`${PREFIX}sepadd_`);
  if (!isEdit && !isAdd) return false;

  const rest = customId.slice(PREFIX.length + (isEdit ? 'sepedit_'.length : 'sepadd_'.length));
  const parts = rest.split('_');

  let sessionId;
  let editIndex = null;
  let variant;

  if (isEdit) {
    if (parts[0] === 'cancel') {
      sessionId = parts.slice(1).join('_');
      const session = getSession(sessionId);
      if (!session) { await sessionGone(interaction); return true; }
      if (!ownsSession(interaction, session)) { await notYours(interaction); return true; }
      await refresh(interaction, session);
      return true;
    }
    variant = `${parts[0]}_${parts[1]}`;
    editIndex = parseInt(parts[2], 10);
    sessionId = parts.slice(3).join('_');
  } else {
    if (parts[0] === 'cancel') {
      sessionId = parts.slice(1).join('_');
      const session = getSession(sessionId);
      if (!session) { await sessionGone(interaction); return true; }
      if (!ownsSession(interaction, session)) { await notYours(interaction); return true; }
      await refresh(interaction, session);
      return true;
    }
    variant = `${parts[0]}_${parts[1]}`;
    sessionId = parts.slice(2).join('_');
  }

  const session = getSession(sessionId);
  if (!session) { await sessionGone(interaction); return true; }
  if (!ownsSession(interaction, session)) { await notYours(interaction); return true; }

  const [spacing, divFlag] = variant.split('_');
  const divider = divFlag === 'div';
  const spacingValue = spacing === 'large' ? 'large' : 'small';

  if (isEdit) {
    if (Number.isInteger(editIndex) && session.blocks[editIndex]?.type === 'separator') {
      session.blocks[editIndex] = { type: 'separator', spacing: spacingValue, divider };
    }
  } else {
    session.blocks.push({ type: 'separator', spacing: spacingValue, divider });
    session.selectedBlockIndex = session.blocks.length - 1;
  }

  await refresh(interaction, session);
  return true;
}

async function handleModal(interaction) {
  const customId = interaction.customId;
  const rest = customId.slice(PREFIX.length);
  if (!rest.startsWith('modal_')) return false;
  const after = rest.slice('modal_'.length);

  const segments = after.split('_');
  const type = segments[0];
  const mode = segments[1];

  let editIndex = null;
  let sessionId;

  if (mode === 'edit') {
    editIndex = parseInt(segments[2], 10);
    sessionId = segments.slice(3).join('_');
  } else if (mode === 'new' || mode === 'set') {
    sessionId = segments.slice(2).join('_');
  } else {
    return false;
  }

  const session = getSession(sessionId);
  if (!session) { await sessionGone(interaction); return true; }
  if (!ownsSession(interaction, session)) { await notYours(interaction); return true; }

  if (type === 'color') {
    const hex = interaction.fields.getTextInputValue('hex');
    const parsed = parseHexColor(hex);
    if (parsed === null) {
      return interaction.reply({
        content: 'Invalid hex color. Use 6 hex digits like `5865F2`.',
        flags: MessageFlags.Ephemeral
      });
    }
    session.accentColor = parsed;
    return refresh(interaction, session);
  }

  let block;
  switch (type) {
    case 'text': {
      const content = interaction.fields.getTextInputValue('content');
      block = { type: 'text', content };
      break;
    }
    case 'section': {
      const content = interaction.fields.getTextInputValue('content');
      const thumb = interaction.fields.getTextInputValue('thumb');
      if (thumb && !isHttpUrl(thumb)) {
        return interaction.reply({
          content: 'Thumbnail URL must be an http(s) URL.',
          flags: MessageFlags.Ephemeral
        });
      }
      block = { type: 'section', content, thumbnailUrl: thumb || '' };
      break;
    }
    case 'media': {
      const items = parseMediaItems(
        interaction.fields.getTextInputValue('items'),
        interaction.fields.getTextInputValue('descriptions')
      );
      if (items.length === 0) {
        return interaction.reply({
          content: 'No valid http(s) image URLs were provided.',
          flags: MessageFlags.Ephemeral
        });
      }
      block = { type: 'media', items };
      break;
    }
    case 'buttons': {
      const buttons = parseButtons(interaction.fields.getTextInputValue('buttons'));
      if (buttons.length === 0) {
        return interaction.reply({
          content: 'No valid `Label | URL` lines were provided.',
          flags: MessageFlags.Ephemeral
        });
      }
      block = { type: 'buttons', buttons };
      break;
    }
    default:
      return false;
  }

  if (mode === 'edit' && Number.isInteger(editIndex) && editIndex >= 0 && editIndex < session.blocks.length) {
    session.blocks[editIndex] = block;
  } else {
    session.blocks.push(block);
    session.selectedBlockIndex = session.blocks.length - 1;
  }

  return refresh(interaction, session);
}

module.exports = { handle };

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */