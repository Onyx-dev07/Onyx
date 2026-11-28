// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags } = require("discord.js");
const { getRandomTenorGif } = require('../../../lib/gifHelper');

module.exports = {
  name: "bow",
  description: "Take a bow",

  async execute(message, args) {
    const gifUrl = await getRandomTenorGif("anime bow");

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# Taking a Bow")
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

    if (gifUrl) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems([
          new MediaGalleryItemBuilder().setURL(gifUrl)
        ])
      );
    }

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${message.author.username}** takes a respectful bow!`)
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
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