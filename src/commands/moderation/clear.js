const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { errorEmbed, actionEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'clear',
  aliases: ['clean'],
  description: 'Deletes a specified number of messages (1-100) from the channel.',
  userPermissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages],
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Deletes a specified number of messages (1-100) from the channel.')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),

  async executeSlash(interaction) {
    const amount = interaction.options.getInteger('amount');
    try {
      const deleted = await interaction.channel.bulkDelete(amount, true);
      await interaction.reply({
        embeds: [actionEmbed({
          title: 'Messages Deleted',
          icon: 'trash',
          moderator: `<@${interaction.user.id}>`,
          reason: `Bulk deleted messages older than 14 days are not deleted.`,
          fields: [{ name: 'Messages Deleted', value: `${deleted.size}`, inline: true }]
        })],
        flags: MessageFlags.Ephemeral
      });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to delete messages: ${err.message}`)], flags: MessageFlags.Ephemeral });
    }
  },

  async executePrefix(message, args) {
    const amount = parseInt(args[0], 10);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply({ embeds: [errorEmbed('Please provide a number between 1 and 100.')] });
    }

    try {
      // Delete user command message first
      await message.delete().catch(() => {});
      const deleted = await message.channel.bulkDelete(amount, true);
      const reply = await message.channel.send({
        embeds: [actionEmbed({
          title: 'Messages Deleted',
          icon: 'trash',
          moderator: `<@${message.author.id}>`,
          reason: `Bulk deleted messages older than 14 days are not deleted.`,
          fields: [{ name: 'Messages Deleted', value: `${deleted.size}`, inline: true }]
        })]
      });
      setTimeout(() => reply.delete().catch(() => {}), 4000);
    } catch (err) {
      await message.channel.send({ embeds: [errorEmbed(`Failed to delete messages: ${err.message}`)] });
    }
  }
};
