// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require("discord.js");

const emojis = require('../../../emojis.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("users")
    .setDescription("Checks total users of Onyx"),

  async execute(interaction) {
    const { client } = interaction;
    const users = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
    const guilds = client.guilds.cache.size;

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**${client.user.username} Users**`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`- **Users:** ${users.toLocaleString()}\n- **Servers:** ${guilds.toLocaleString()}`)
      );

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
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