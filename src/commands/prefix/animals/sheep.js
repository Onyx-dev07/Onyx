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
  name: "sheep",
  description: "Random picture of a sheep",

  async execute(message) {
    try {
      const imageUrl = await fetchAnimalImage('sheep');
      if (!imageUrl) return message.reply(`${emojis.error} No image found right now. Try again in a moment.`);

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Random Sheep`)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(imageUrl).setDescription("Random sheep image")
          )
        );

      await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      console.error("Error fetching sheep image:", error);
      await message.reply(`${emojis.error} Failed to fetch sheep image. Please try again later.`);
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