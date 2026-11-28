// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require("discord.js");
const { getRandomTenorGif } = require('../../../lib/gifHelper');
const emojis = require('../../../emojis.json');

module.exports = {
  name: "lick",
  description: "Lick someone",

  async execute(message, args) {
    const targetUser = message.mentions.users.first();
    
    if (!targetUser) {
      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Please mention a user to lick!\n**Usage:** \`lick @user\``)
        );
      return message.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const gifUrl = await getRandomTenorGif("anime lick");

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# Lick")
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
      new TextDisplayBuilder().setContent(`**${message.author.username}** licks **${targetUser.username}**`)
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const respondButton = new ButtonBuilder()
      .setCustomId(`lick_back_${message.author.id}_${targetUser.id}`)
      .setLabel("Lick Back")
      .setStyle(ButtonStyle.Primary);

    const buttonRow = new ActionRowBuilder().addComponents(respondButton);
    container.addActionRowComponents(buttonRow);

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