const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');

const MAX_OPTIONS = 5;
const POLL_DURATION_HOURS = 24;

function pollPayload(question, options) {
  return {
    poll: {
      question: { text: question.slice(0, 300) },
      answers: options.slice(0, MAX_OPTIONS).map(text => ({ text: text.slice(0, 55) })),
      duration: POLL_DURATION_HOURS,
      allowMultiselect: false
    }
  };
}

module.exports = {
  name: 'poll',
  aliases: ['vote'],
  description: 'Creates a native Discord poll with up to 5 options.',
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Creates a native Discord poll with up to 5 options.')
    .addStringOption(opt => opt.setName('question').setDescription('Poll question').setRequired(true).setMaxLength(300))
    .addStringOption(opt => opt.setName('option1').setDescription('First option').setRequired(true).setMaxLength(55))
    .addStringOption(opt => opt.setName('option2').setDescription('Second option').setRequired(true).setMaxLength(55))
    .addStringOption(opt => opt.setName('option3').setDescription('Third option').setRequired(false).setMaxLength(55))
    .addStringOption(opt => opt.setName('option4').setDescription('Fourth option').setRequired(false).setMaxLength(55))
    .addStringOption(opt => opt.setName('option5').setDescription('Fifth option').setRequired(false).setMaxLength(55)),

  async executeSlash(interaction) {
    const question = interaction.options.getString('question');
    const options = [
      interaction.options.getString('option1'),
      interaction.options.getString('option2'),
      interaction.options.getString('option3'),
      interaction.options.getString('option4'),
      interaction.options.getString('option5')
    ].filter(Boolean);

    await interaction.reply(pollPayload(question, options));
  },

  async executePrefix(message, args) {
    const parts = args.join(' ').split('|').map(part => part.trim()).filter(Boolean);

    if (parts.length < 3) {
      return message.reply({
        embeds: [errorEmbed('Usage: `!poll Question | Option 1 | Option 2 [| Option 3...]`')]
      });
    }

    const question = parts[0];
    const options = parts.slice(1, MAX_OPTIONS + 1);

    await message.channel.send(pollPayload(question, options));
  }
};
