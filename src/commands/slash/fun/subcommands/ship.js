// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const {
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  AttachmentBuilder,
  MessageFlags,
} = require('discord.js');
const canvafy = require('canvafy');

module.exports = {
  name: 'ship',
  description: 'Ship two users together!',

  async execute(interaction) {
    const user1 = interaction.options.getUser('user1');
    const user2 = interaction.options.getUser('user2') || interaction.user;

    await interaction.deferReply();

    try {
      const avatar1 = user1.displayAvatarURL({ extension: 'png', size: 512, forceStatic: true });
      const avatar2 = user2.displayAvatarURL({ extension: 'png', size: 512, forceStatic: true });

      const shipCard = await new canvafy.Ship()
        .setAvatars(avatar1, avatar2)
        .setBackground('color', '#2B2D31')
        .setOverlayOpacity(0.3)
        .setBorder('#ff69b4')
        .build();

      const attachment = new AttachmentBuilder(shipCard, { name: 'ship.png' });

      const container = new ContainerBuilder().setAccentColor(0xff69b4)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### 💘 Ship`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${user1.displayName}** + **${user2.displayName}**`)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
              .setURL('attachment://ship.png')
              .setDescription(`${user1.username} x ${user2.username}`)
          )
        );

      return interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        files: [attachment],
      });
    } catch (error) {
      console.error('ShipCommand Error:', error);

      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Error')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Failed to generate ship card. Please try again.')
        );

      return interaction.editReply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */