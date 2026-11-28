// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags
} = require('discord.js');

const sessions = new Map();
const SESSION_TTL = 14 * 60 * 1000;

function isHttpUrl(value) {
  if (!value || typeof value !== 'string') return false;
  return /^https?:\/\/\S+$/i.test(value.trim());
}

function parseHexColor(input) {
  if (!input) return null;
  const cleaned = input.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  return parseInt(cleaned, 16);
}

function createSession(userId, guildId) {
  const sessionId = `${userId}_${Date.now().toString(36)}`;
  const session = {
    id: sessionId,
    userId,
    guildId,
    createdAt: Date.now(),
    accentColor: null,
    targetChannelId: null,
    selectedBlockIndex: null,
    blocks: []
  };
  sessions.set(sessionId, session);
  return session;
}

function getSession(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return null;
  if (Date.now() - s.createdAt > SESSION_TTL) {
    sessions.delete(sessionId);
    return null;
  }
  return s;
}

function deleteSession(sessionId) {
  sessions.delete(sessionId);
}

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.createdAt > SESSION_TTL) sessions.delete(id);
  }
}, 60 * 1000);

function summarizeBlock(block, index) {
  const num = index + 1;
  switch (block.type) {
    case 'text': {
      const preview = (block.content || '').replace(/\n/g, ' ').slice(0, 50);
      return `${num}. Text Display — ${preview || '(empty)'}`;
    }
    case 'section': {
      const preview = (block.content || '').replace(/\n/g, ' ').slice(0, 40);
      return `${num}. Section — ${preview || '(empty)'}`;
    }
    case 'separator': {
      return `${num}. Separator — ${block.spacing} ${block.divider ? 'with divider' : 'no divider'}`;
    }
    case 'media': {
      return `${num}. Media Gallery — ${block.items.length} item(s)`;
    }
    case 'buttons': {
      return `${num}. Button Row — ${block.buttons.length} link button(s)`;
    }
    default:
      return `${num}. Unknown`;
  }
}

function buildPreviewContainer(session) {
  const container = new ContainerBuilder();
  if (session.accentColor !== null && session.accentColor !== undefined) {
    container.setAccentColor(session.accentColor);
  }

  if (session.blocks.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('-# Empty container. Use the controls below to add components.')
    );
    return container;
  }

  for (const block of session.blocks) {
    switch (block.type) {
      case 'text': {
        if (block.content && block.content.trim().length > 0) {
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(block.content)
          );
        }
        break;
      }
      case 'section': {
        const section = new SectionBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(block.content || ' ')
        );
        if (isHttpUrl(block.thumbnailUrl)) {
          section.setThumbnailAccessory(
            new ThumbnailBuilder().setURL(block.thumbnailUrl.trim())
          );
        } else {
          section.setThumbnailAccessory(
            new ThumbnailBuilder().setURL('https://cdn.discordapp.com/embed/avatars/0.png')
          );
        }
        container.addSectionComponents(section);
        break;
      }
      case 'separator': {
        const sep = new SeparatorBuilder()
          .setSpacing(block.spacing === 'large' ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small)
          .setDivider(block.divider === true);
        container.addSeparatorComponents(sep);
        break;
      }
      case 'media': {
        const validItems = block.items.filter(i => isHttpUrl(i.url));
        if (validItems.length === 0) break;
        const gallery = new MediaGalleryBuilder();
        for (const item of validItems) {
          const galleryItem = new MediaGalleryItemBuilder().setURL(item.url.trim());
          if (item.description && item.description.trim()) {
            galleryItem.setDescription(item.description.trim().slice(0, 256));
          }
          gallery.addItems(galleryItem);
        }
        container.addMediaGalleryComponents(gallery);
        break;
      }
      case 'buttons': {
        const valid = block.buttons.filter(b => b.label && isHttpUrl(b.url)).slice(0, 5);
        if (valid.length === 0) break;
        const row = new ActionRowBuilder();
        for (const b of valid) {
          row.addComponents(
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setLabel(b.label.slice(0, 80))
              .setURL(b.url.trim())
          );
        }
        container.addActionRowComponents(row);
        break;
      }
    }
  }

  return container;
}

function buildControlsContainer(session) {
  const sid = session.id;
  const controls = new ContainerBuilder().setAccentColor(0x2B2D31);

  controls.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('### Container Builder')
  );
  controls.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
  );

  const accentLine = (session.accentColor === null || session.accentColor === undefined)
    ? 'Accent Color: none'
    : 'Accent Color: `#' + session.accentColor.toString(16).padStart(6, '0').toUpperCase() + '`';
  const channelLine = session.targetChannelId
    ? `Target Channel: <#${session.targetChannelId}>`
    : 'Target Channel: not set';
  controls.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${accentLine}\n${channelLine}\nBlocks: ${session.blocks.length}`
    )
  );

  controls.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
  );

  const addMenu = new StringSelectMenuBuilder()
    .setCustomId(`cb_add_${sid}`)
    .setPlaceholder('Add a new component...')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Text Display')
        .setValue('text')
        .setDescription('A block of formatted text (markdown supported).'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Section with Thumbnail')
        .setValue('section')
        .setDescription('Text content with a thumbnail image accessory.'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Separator')
        .setValue('separator')
        .setDescription('A spacer line, optionally with a divider.'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Media Gallery')
        .setValue('media')
        .setDescription('Up to 10 image/video URLs in a gallery.'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Link Buttons Row')
        .setValue('buttons')
        .setDescription('Up to 5 link buttons in a row.')
    );
  controls.addActionRowComponents(new ActionRowBuilder().addComponents(addMenu));

  if (session.blocks.length > 0) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`cb_select_${sid}`)
      .setPlaceholder('Select a component to manage...')
      .addOptions(
        session.blocks.slice(0, 25).map((block, idx) => {
          const opt = new StringSelectMenuOptionBuilder()
            .setLabel(summarizeBlock(block, idx).slice(0, 100))
            .setValue(String(idx));
          if (session.selectedBlockIndex === idx) opt.setDefault(true);
          return opt;
        })
      );
    controls.addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu));

    const hasSelection = session.selectedBlockIndex !== null
      && session.selectedBlockIndex >= 0
      && session.selectedBlockIndex < session.blocks.length;

    const manageRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`cb_edit_${sid}`)
        .setLabel('Edit')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!hasSelection),
      new ButtonBuilder()
        .setCustomId(`cb_up_${sid}`)
        .setLabel('Move Up')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!hasSelection || session.selectedBlockIndex === 0),
      new ButtonBuilder()
        .setCustomId(`cb_down_${sid}`)
        .setLabel('Move Down')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!hasSelection || session.selectedBlockIndex === session.blocks.length - 1),
      new ButtonBuilder()
        .setCustomId(`cb_remove_${sid}`)
        .setLabel('Remove')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!hasSelection)
    );
    controls.addActionRowComponents(manageRow);
  }

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(`cb_channel_${sid}`)
    .setPlaceholder('Select a target channel to send to...')
    .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
  controls.addActionRowComponents(new ActionRowBuilder().addComponents(channelSelect));

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`cb_color_${sid}`)
      .setLabel('Set Accent Color')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`cb_send_${sid}`)
      .setLabel('Send')
      .setStyle(ButtonStyle.Success)
      .setDisabled(session.blocks.length === 0 || !session.targetChannelId),
    new ButtonBuilder()
      .setCustomId(`cb_reset_${sid}`)
      .setLabel('Reset')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`cb_cancel_${sid}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger)
  );
  controls.addActionRowComponents(actionRow);

  return controls;
}

function buildBuilderMessage(session) {
  return {
    components: [buildPreviewContainer(session), buildControlsContainer(session)],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
  };
}

module.exports = {
  sessions,
  createSession,
  getSession,
  deleteSession,
  buildPreviewContainer,
  buildControlsContainer,
  buildBuilderMessage,
  summarizeBlock,
  isHttpUrl,
  parseHexColor
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */