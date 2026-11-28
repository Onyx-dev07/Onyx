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
  name: 'hexdec',
  description: 'Convert hexadecimal to decimal',
  
  async execute(interaction) {
    let hex = interaction.options.getString('hex').trim();
    
    hex = hex.replace(/^0x/i, '');
    
    if (!/^[0-9A-Fa-f]+$/.test(hex)) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Invalid hexadecimal value! Use only 0-9 and A-F.`)
        );
      return interaction.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }

    const decimal = parseInt(hex, 16);
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Hexadecimal to Decimal**`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emojis.arrow} **0x${hex.toUpperCase()}** = **${decimal}**`
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