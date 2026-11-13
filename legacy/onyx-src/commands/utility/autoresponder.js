const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../database');
const { successEmbed, errorEmbed, createEmbed } = require('../../utils/embeds');

const MAX_AUTORESPONDERS = 20;

function listEmbed(guild) {
  const responders = db.getAutoresponders(guild.id);
  const triggers = Object.keys(responders);

  if (triggers.length === 0) {
    return createEmbed({
      title: `Autoresponders in ${guild.name}`,
      description: 'No autoresponders configured.\nUsage: `/autoresponder create <trigger> <response>`'
    });
  }

  return createEmbed({
    title: `Autoresponders in ${guild.name} (${triggers.length}/${MAX_AUTORESPONDERS})`,
    fields: triggers.slice(0, 25).map((trigger, index) => ({
      name: `[${index + 1}] ${trigger}`,
      value: responders[trigger].length > 1024 ? `${responders[trigger].slice(0, 1021)}...` : responders[trigger]
    }))
  });
}

function validateTrigger(trigger) {
  if (!trigger) return 'Please provide a trigger.';
  if (trigger.length > 100) return 'Triggers must be 100 characters or fewer.';
  if (trigger.trim().length === 0) return 'Triggers cannot be empty.';
  return null;
}

function validateResponse(response) {
  if (!response) return 'Please provide a response.';
  if (response.length > 1500) return 'Responses must be 1500 characters or fewer.';
  return null;
}

module.exports = {
  name: 'autoresponder',
  aliases: ['ar', 'autoresponses'],
  description: 'Manages automatic responses that trigger when a message exactly matches the configured phrase.',
  userPermissions: [PermissionFlagsBits.Administrator],
  data: new SlashCommandBuilder()
    .setName('autoresponder')
    .setDescription('Manages automatic responses for this server.')
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a new autoresponder')
        .addStringOption(opt => opt.setName('trigger').setDescription('Exact phrase that triggers the response').setRequired(true))
        .addStringOption(opt => opt.setName('response').setDescription('Response to send').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('edit')
        .setDescription('Edit an existing autoresponder response')
        .addStringOption(opt => opt.setName('trigger').setDescription('Existing trigger').setRequired(true))
        .addStringOption(opt => opt.setName('response').setDescription('New response').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Delete an autoresponder')
        .addStringOption(opt => opt.setName('trigger').setDescription('Trigger to delete').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('list').setDescription('List all autoresponders in this server')),

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const responders = db.getAutoresponders(guild.id);

    if (sub === 'create') {
      const trigger = interaction.options.getString('trigger').trim().toLowerCase();
      const response = interaction.options.getString('response');

      const triggerError = validateTrigger(trigger);
      if (triggerError) return interaction.reply({ embeds: [errorEmbed(triggerError)], flags: MessageFlags.Ephemeral });
      const responseError = validateResponse(response);
      if (responseError) return interaction.reply({ embeds: [errorEmbed(responseError)], flags: MessageFlags.Ephemeral });

      if (responders[trigger]) {
        return interaction.reply({ embeds: [errorEmbed(`An autoresponder for \`${trigger}\` already exists. Use \`/autoresponder edit\` instead.`)] });
      }
      if (Object.keys(responders).length >= MAX_AUTORESPONDERS) {
        return interaction.reply({ embeds: [errorEmbed(`This server has reached the maximum of **${MAX_AUTORESPONDERS}** autoresponders.`)] });
      }

      db.setAutoresponder(guild.id, trigger, response);
      return interaction.reply({ embeds: [successEmbed(`Created autoresponder \`${trigger}\`.`)] });
    }

    if (sub === 'edit') {
      const trigger = interaction.options.getString('trigger').trim().toLowerCase();
      const response = interaction.options.getString('response');

      const responseError = validateResponse(response);
      if (responseError) return interaction.reply({ embeds: [errorEmbed(responseError)], flags: MessageFlags.Ephemeral });

      if (!responders[trigger]) {
        return interaction.reply({ embeds: [errorEmbed(`No autoresponder found for \`${trigger}\`.`)] });
      }

      db.setAutoresponder(guild.id, trigger, response);
      return interaction.reply({ embeds: [successEmbed(`Updated autoresponder \`${trigger}\`.`)] });
    }

    if (sub === 'delete') {
      const trigger = interaction.options.getString('trigger').trim().toLowerCase();
      if (!responders[trigger]) {
        return interaction.reply({ embeds: [errorEmbed(`No autoresponder found for \`${trigger}\`.`)] });
      }

      db.removeAutoresponder(guild.id, trigger);
      return interaction.reply({ embeds: [successEmbed(`Deleted autoresponder \`${trigger}\`.`)] });
    }

    if (sub === 'list') {
      return interaction.reply({ embeds: [listEmbed(guild)] });
    }
  },

  async executePrefix(message, args) {
    const sub = args[0]?.toLowerCase();
    const guild = message.guild;
    const prefix = db.getPrefix(guild.id, process.env.DEFAULT_PREFIX || '!');
    const responders = db.getAutoresponders(guild.id);

    if (!sub || sub === 'list' || sub === 'config') {
      return message.reply({ embeds: [listEmbed(guild)] });
    }

    if (sub === 'create') {
      const trigger = args[1]?.trim().toLowerCase();
      const response = args.slice(2).join(' ');

      const triggerError = validateTrigger(trigger);
      if (triggerError) return message.reply({ embeds: [errorEmbed(triggerError)] });
      const responseError = validateResponse(response);
      if (responseError) return message.reply({ embeds: [errorEmbed(`${responseError}\nUsage: \`${prefix}autoresponder create <trigger> <response>\``)] });

      if (responders[trigger]) {
        return message.reply({ embeds: [errorEmbed(`An autoresponder for \`${trigger}\` already exists.`)] });
      }
      if (Object.keys(responders).length >= MAX_AUTORESPONDERS) {
        return message.reply({ embeds: [errorEmbed(`This server has reached the maximum of **${MAX_AUTORESPONDERS}** autoresponders.`)] });
      }

      db.setAutoresponder(guild.id, trigger, response);
      return message.reply({ embeds: [successEmbed(`Created autoresponder \`${trigger}\`.`)] });
    }

    if (sub === 'edit') {
      const trigger = args[1]?.trim().toLowerCase();
      const response = args.slice(2).join(' ');

      if (!trigger || !responders[trigger]) {
        return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}autoresponder edit <trigger> <response>\``)] });
      }

      const responseError = validateResponse(response);
      if (responseError) return message.reply({ embeds: [errorEmbed(responseError)] });

      db.setAutoresponder(guild.id, trigger, response);
      return message.reply({ embeds: [successEmbed(`Updated autoresponder \`${trigger}\`.`)] });
    }

    if (sub === 'delete' || sub === 'remove') {
      const trigger = args[1]?.trim().toLowerCase();
      if (!trigger || !responders[trigger]) {
        return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}autoresponder delete <trigger>\``)] });
      }

      db.removeAutoresponder(guild.id, trigger);
      return message.reply({ embeds: [successEmbed(`Deleted autoresponder \`${trigger}\`.`)] });
    }

    return message.reply({
      embeds: [createEmbed({
        title: 'Autoresponder Usage',
        description: `\`${prefix}autoresponder create <trigger> <response>\`\n\`${prefix}autoresponder edit <trigger> <response>\`\n\`${prefix}autoresponder delete <trigger>\`\n\`${prefix}autoresponder list\``
      })]
    });
  }
};
