const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

const responses = [
  'It is certain.',
  'It is decidedly so.',
  'Without a doubt.',
  'Yes definitely.',
  'You may rely on it.',
  'As I see it, yes.',
  'Most likely.',
  'Outlook good.',
  'Yes.',
  'Signs point to yes.',
  'Reply hazy, try again.',
  'Ask again later.',
  'Better not tell you now.',
  'Cannot predict now.',
  'Concentrate and ask again.',
  "Don't count on it.",
  'My reply is no.',
  'My sources say no.',
  'Outlook not so good.',
  'Very doubtful.'
];

module.exports = {
  name: '8ball',
  aliases: ['8b'],
  description: 'Ask the magic 8-ball a question and receive an answer.',
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a question and receive an answer.')
    .addStringOption(opt =>
      opt.setName('question')
        .setDescription('Your question')
        .setRequired(true)
    ),

  async executeSlash(interaction) {
    const question = interaction.options.getString('question');
    const answer = responses[Math.floor(Math.random() * responses.length)];

    const embed = createEmbed({
      title: 'Magic 8-Ball',
      fields: [
        { name: 'Question', value: question },
        { name: 'Answer', value: answer }
      ]
    });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const question = args.join(' ');
    if (!question) {
      return message.reply({
        embeds: [errorEmbed('Please ask a question. Usage: `!8ball will I win today?`')]
      });
    }

    const answer = responses[Math.floor(Math.random() * responses.length)];
    const embed = createEmbed({
      title: 'Magic 8-Ball',
      fields: [
        { name: 'Question', value: question },
        { name: 'Answer', value: answer }
      ]
    });

    await message.reply({ embeds: [embed] });
  }
};

