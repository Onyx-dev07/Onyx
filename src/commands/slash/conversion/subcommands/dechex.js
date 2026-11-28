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
  name: 'dechex',
  description: 'Convert decimal to hexadecimal',
  
  async execute(interaction) {
    const decimal = interaction.options.getInteger('decimal');
    
    if (decimal < 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Decimal value cannot be negative!`)
        );
      return interaction.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }

    const hex = decimal.toString(16).toUpperCase();
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Decimal to Hexadecimal**`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emojis.arrow} **${decimal}** = **0x${hex}**`
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