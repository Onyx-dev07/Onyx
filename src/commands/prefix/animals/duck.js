// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} = require("discord.js");

const emojis = require('../../../emojis.json');
const { fetchAnimalImage } = require('../../../lib/animalApi');

module.exports = {
  name: "duck",
  description: "Random picture of a duck",

  async execute(message) {
    try {
      const imageUrl = await fetchAnimalImage('duck');
      if (!imageUrl) return message.reply(`${emojis.error} No image found right now. Try again in a moment.`);

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Random Duck`)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(imageUrl).setDescription("Random duck image")
          )
        );

      await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      console.error("Error fetching duck image:", error);
      await message.reply(`${emojis.error} Failed to fetch duck image. Please try again later.`);
    }
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