// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags } = require("discord.js");
const { getNekoGif } = require('../../../../lib/nekoHelper');

module.exports = {
  async execute(interaction) {
    const author = interaction.user;

    await interaction.deferReply({ flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 });

    const gifUrl = await getNekoGif("laugh");

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# Laughing")
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
      new TextDisplayBuilder().setContent(`**${author.username}** is laughing out loud!`)
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    await interaction.editReply({ components: [container], flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 });
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