// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require("discord.js");
const { getRandomTenorGif } = require('../../../../lib/gifHelper');

module.exports = {
  async execute(interaction) {
    const targetUser = interaction.options.getUser("user");
    const author = interaction.user;

    await interaction.deferReply({ flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 });

    const gifUrl = await getRandomTenorGif("anime kill");

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# Kill Action")
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
      new TextDisplayBuilder().setContent(`**${author.username}** eliminates **${targetUser.username}**`)
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const respondButton = new ButtonBuilder()
      .setCustomId(`kill_back_${author.id}_${targetUser.id}`)
      .setLabel("Fight Back")
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(respondButton);
    container.addActionRowComponents(buttonRow);

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