// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const emojis = require('../../../emojis.json');

module.exports = {
  name: 'ft',
  description: 'Convert feet.inches to centimeters',
  
  async execute(message, args) {
    if (!args || args.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Please provide feet to convert!\n**Usage:** \`ft <feet> [inches]\``)
        );
      return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    }

    const feet = parseFloat(args[0]);
    const inches = args[1] ? parseFloat(args[1]) : 0;
    
    if (isNaN(feet) || isNaN(inches)) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Invalid number!`)
        );
      return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    }

    if (feet < 0 || inches < 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Values cannot be negative!`)
        );
      return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    }

    const totalInches = (feet * 12) + inches;
    const centimeters = totalInches * 2.54;
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Feet & Inches to Centimeters**`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emojis.arrow} **${feet}' ${inches}"** = **${centimeters.toFixed(2)} cm**`
        )
      );

    return message.reply({
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