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
  name: 'base32',
  description: 'Encode text to Base32',
  
  async execute(interaction) {
    const text = interaction.options.getString('text');
    
    if (text.length > 1000) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Text is too long! Maximum 1000 characters.`)
        );
      return interaction.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }

    try {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      const buffer = Buffer.from(text);
      let encoded = '';
      let bits = 0;
      let value = 0;

      for (let i = 0; i < buffer.length; i++) {
        value = (value << 8) | buffer[i];
        bits += 8;

        while (bits >= 5) {
          encoded += alphabet[(value >>> (bits - 5)) & 31];
          bits -= 5;
        }
      }

      if (bits > 0) {
        encoded += alphabet[(value << (5 - bits)) & 31];
      }

      while (encoded.length % 8 !== 0) {
        encoded += '=';
      }
      
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Base32 Encoding**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${emojis.arrow} **Input:** ${text}\n${emojis.arrow} **Encoded:**\n\`\`\`${encoded}\`\`\``
          )
        );

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Failed to encode to Base32!`)
        );
      return interaction.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
        ephemeral: true
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