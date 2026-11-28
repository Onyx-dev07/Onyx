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
  name: 'cm',
  description: 'Convert centimeters to feet and inches',
  
  async execute(interaction) {
    const centimeters = interaction.options.getNumber('centimeters');
    
    if (centimeters < 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Centimeters cannot be negative!`)
        );
      return interaction.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }

    const totalInches = centimeters / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Centimeters to Feet & Inches**`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emojis.arrow} **${centimeters} cm** = **${feet}' ${inches.toFixed(2)}"**`
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