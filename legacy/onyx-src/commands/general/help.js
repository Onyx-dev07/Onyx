const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');
const db = require('../../database');
const config = require('../../../config.json');
const { paginatedReply } = require('../../utils/pagination');
const { createEmbed, errorEmbed, UI, muted, code } = require('../../utils/embeds');

const DESCRIPTIONS = {
  general: 'User and server information.',
  moderation: 'Member and channel management.',
  utility: 'Helpers for everyday tasks.',
  config: 'Server configuration and security.',
  fun: 'Light entertainment.',
  spamraid: 'Repeated message broadcasts.'
};

const PER_PAGE = 8;

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function permissionLabel(permissions) {
  try {
    const names = new PermissionsBitField(permissions).toArray();
    return names.length ? names.join(', ') : 'Everyone';
  } catch {
    return 'Restricted';
  }
}

function categoryCommands(client, category) {
  const commands = [];
  for (const [name, command] of client.commands) {
    if (command.category?.toLowerCase() !== category.toLowerCase()) continue;
    if (commands.some(entry => entry.name === name)) continue;
    commands.push({ name, description: command.description || command.data?.description || 'No description' });
  }
  return commands.sort((a, b) => a.name.localeCompare(b.name));
}

function mainEmbed(client, prefix) {
  const categories = Array.from(client.categories);
  const mode = prefix === '/'
    ? `Slash commands ${code('/')}`
    : `Prefix ${code(prefix)} ${UI.separator} Slash ${code('/')}`;

  return createEmbed({
    title: 'Command reference',
    description: [
      `**${client.commands.size} commands** across ${categories.length} categories`,
      muted(mode)
    ].join('\n'),
    fields: categories.map(category => ({
      name: `${capitalize(category)} ${UI.separator} ${categoryCommands(client, category).length}`,
      value: DESCRIPTIONS[category.toLowerCase()] || 'Browse this category below.',
      inline: true
    })),
    footer: { text: 'ONYX' }
  });
}

function categoryPages(category, client, prefix) {
  const commands = categoryCommands(client, category);

  if (!commands.length) {
    return [{
      title: `${capitalize(category)} commands`,
      description: `${UI.inactive} No commands in this category.`
    }];
  }

  const pages = [];
  for (let index = 0; index < commands.length; index += PER_PAGE) {
    const chunk = commands.slice(index, index + PER_PAGE);
    pages.push({
      title: `${capitalize(category)} commands`,
      description: [
        muted(`${commands.length} ${commands.length === 1 ? 'command' : 'commands'} ${UI.separator} Prefix ${code(prefix)}`),
        '',
        ...chunk.map(command => [
          `**${prefix}${command.name}**`,
          command.description
        ].join('\n'))
      ].join('\n\n')
    });
  }

  return pages;
}

function helpButtons(client) {
  const categories = Array.from(client.categories);
  const rows = [];
  let row = new ActionRowBuilder();

  for (const category of categories) {
    if (row.components.length >= 5) {
      rows.push(row);
      row = new ActionRowBuilder();
    }

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`help_${category}`)
        .setLabel(capitalize(category))
        .setStyle(ButtonStyle.Secondary)
    );
  }

  if (row.components.length) rows.push(row);
  return rows;
}

function commandEmbed(command, name, prefix) {
  const fields = [
    { name: 'Category', value: capitalize(command.category || 'General'), inline: true },
    { name: 'Permissions', value: permissionLabel(command.userPermissions), inline: true },
    { name: 'Usage', value: code(`/${name}`), inline: true }
  ];

  if (prefix && prefix !== '/') {
    fields.push({ name: 'Prefix usage', value: code(`${prefix}${name}`), inline: true });
  }

  if (command.aliases?.length) {
    const aliasPrefix = prefix === '/' ? config.defaultPrefix : prefix;
    fields.push({
      name: 'Aliases',
      value: command.aliases.map(alias => code(`${aliasPrefix}${alias}`)).join(', ')
    });
  }

  return createEmbed({
    title: name,
    description: command.description || command.data?.description || 'No description',
    fields,
    footer: { text: capitalize(command.category || 'General') }
  });
}

module.exports = {
  name: 'help',
  description: 'Displays the help menu with all available commands and categories.',
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays the help menu with all available commands and categories.')
    .addStringOption(option =>
      option.setName('command')
        .setDescription('Get detailed help for a specific command')
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    const client = interaction.client;
    const cmdName = interaction.options.getString('command');

    if (cmdName) {
      const key = cmdName.toLowerCase();
      const command = client.commands.get(key) || client.commands.get(client.aliases.get(key));
      if (!command) {
        return interaction.reply({
          embeds: [errorEmbed(`Command ${code(cmdName)} was not found.`)],
          flags: MessageFlags.Ephemeral
        });
      }
      return interaction.reply({ embeds: [commandEmbed(command, command.name || key, '/')] });
    }

    return interaction.reply({
      embeds: [mainEmbed(client, '/')],
      components: helpButtons(client)
    });
  },

  async executePrefix(message, args, client, prefix) {
    if (args[0]) {
      const key = args[0].toLowerCase();
      const command = client.commands.get(key) || client.commands.get(client.aliases.get(key));
      if (!command) {
        return message.reply({ embeds: [errorEmbed(`Command ${code(key)} was not found.`)] });
      }
      return message.reply({ embeds: [commandEmbed(command, command.name || key, prefix)] });
    }

    return message.reply({
      embeds: [mainEmbed(client, prefix)],
      components: helpButtons(client)
    });
  },

  async handleButton(interaction, client) {
    const category = interaction.customId.slice('help_'.length);

    if (!client.categories.has(category)) {
      return interaction.reply({
        embeds: [errorEmbed('That category no longer exists.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const prefix = db.getPrefix(
      interaction.guildId,
      process.env.DEFAULT_PREFIX || config.defaultPrefix || '!'
    );
    const pages = categoryPages(category, client, prefix);

    if (pages.length === 1) {
      return interaction.update({
        embeds: [createEmbed(pages[0])],
        components: []
      });
    }

    const { payload } = paginatedReply({
      authorId: interaction.user.id,
      pages,
      footerLabel: `${capitalize(category)} commands`
    });

    return interaction.update(payload);
  }
};
