const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
  name: 'embed',
  description: 'Creates and sends a custom formatted embed.',
  userPermissions: [PermissionFlagsBits.ManageMessages],
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Creates and sends a custom formatted embed.')
    .addStringOption(opt => opt.setName('title').setDescription('Embed title').setRequired(true))
    .addStringOption(opt => opt.setName('description').setDescription('Embed description text').setRequired(true))
    .addStringOption(opt => opt.setName('color').setDescription('Hex color code (e.g. #A0A4AD)').setRequired(false))
    .addStringOption(opt => opt.setName('image').setDescription('Image URL').setRequired(false)),

  async executeSlash(interaction) {
    // Acknowledge before sending so a slow channel cannot time out the command.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const color = interaction.options.getString('color') || config.colors.accent;
    const image = interaction.options.getString('image');

    const embed = createEmbed({
      title,
      description,
      color,
      image: image || undefined,
      author: { name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) }
    });

    try {
      await interaction.channel.send({ embeds: [embed] });
      return interaction.editReply({ embeds: [successEmbed('Embed sent.')] });
    } catch (err) {
      return interaction.editReply({ embeds: [errorEmbed(`Failed to create embed: ${err.message}`)] });
    }
  },

  async executePrefix(message, args) {
    const raw = args.join(' ');
    const parts = raw.split('|').map(s => s.trim());
    if (parts.length < 2) {
      return message.reply({
        embeds: [errorEmbed('Usage: `!embed Title | Description [| #HexColor]`')]
      });
    }

    const title = parts[0];
    const description = parts[1];
    const color = parts[2] || config.colors.accent;

    const embed = createEmbed({
      title,
      description,
      color,
      author: { name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) }
    });

    await message.delete().catch(() => {});
    await message.channel.send({ embeds: [embed] });
  }
};

