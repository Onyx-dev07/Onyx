// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} = require('discord.js');
const emojis = require('../../../emojis.json');
const { createPaginationSession } = require('../../../lib/pagination');
const { fetchPfps } = require('../../../lib/pfpApi');

module.exports = {
  name: 'pfp male',
  aliases: ['pfps male'],
  description: 'Browse male profile pictures',

  async execute(message, args) {
    let pfps;
    try {
      pfps = await fetchPfps('male');
    } catch {
      pfps = [];
    }

    if (!pfps || pfps.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} No male pfps found. Try again later.`)
        );
      return message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const pagination = createPaginationSession({
      interactionOrMessage: message,
      pages: pfps,
      userId: message.author.id,
      renderPage: (pageIndex, imageUrl) => {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Male Profile Pictures`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
        container.addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(imageUrl).setDescription('Male Profile Picture')
          )
        );
        return container;
      }
    });

    await pagination.renderInitial();
  }
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */