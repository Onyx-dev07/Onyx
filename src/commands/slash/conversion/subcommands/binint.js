// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const emojis = require('../../../../emojis.json');

module.exports = {
  name: 'binint',
  description: 'Convert binary to an integer',
  
  async execute(interaction) {
    const binary = interaction.options.getString('binary').trim();
    
    if (!/^[01]+$/.test(binary)) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Invalid binary value! Use only 0 and 1.`)
        );
      return interaction.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }

    const integer = parseInt(binary, 2);
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Binary to Integer**`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emojis.arrow} **${binary}** = **${integer}**`
        )
      );

    return interaction.reply({
      components: [container],
      flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
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