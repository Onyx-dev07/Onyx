const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');
const db = require('../../database');
const config = require('../../../config.json');
const { securityEmbed, receiptText, muted, code, UI } = require('../../utils/embeds');

const FILTERS = [
  { key: 'antiSpam', slug: 'antispam', name: 'Anti-Spam', aliases: ['spam'] },
  { key: 'antiCaps', slug: 'anticaps', name: 'Anti-Caps', aliases: ['caps'] },
  { key: 'antiLink', slug: 'antilink', name: 'Anti-Link', aliases: ['link', 'links'] },
  { key: 'antiInvite', slug: 'antiinvite', name: 'Anti-Invite', aliases: ['invite', 'invites'] },
  { key: 'antiMassMention', slug: 'antimassmention', name: 'Anti-Mass Mention', aliases: ['massmention', 'mentions'] },
  { key: 'antiEmojiSpam', slug: 'antiemojispam', name: 'Anti-Emoji Spam', aliases: ['emoji', 'emojis', 'emojispam'] },
  { key: 'antiNsfwLink', slug: 'antinsfwlink', name: 'Anti-NSFW Link', aliases: ['nsfw', 'nsfwlink'] },
  { key: 'antiExternalApps', slug: 'antiexternalapps', name: 'Anti-External Apps', aliases: ['externalapps', 'apps', 'externalapp'] },
  { key: 'antiTokenSpam', slug: 'antitokenspam', name: 'Anti-Token Spam', aliases: ['token', 'tokens', 'tokenspam'] }
];

function normalize(value = '') {
  return value.toLowerCase().replace(/[\s_-]/g, '');
}

function resolveFilter(input) {
  if (!input) return null;
  const query = normalize(input);
  return FILTERS.find(filter =>
    normalize(filter.slug) === query ||
    normalize(filter.key) === query ||
    normalize(filter.name) === query ||
    filter.aliases.includes(query)
  ) || null;
}

// Empty or "all" means every filter; otherwise accept "caps, spam" or "caps spam".
function parseFilters(input = '') {
  const value = input.trim();
  if (!value || normalize(value) === 'all') {
    return { targets: FILTERS, invalid: [] };
  }

  const targets = [];
  const invalid = [];

  for (const group of value.split(',').map(entry => entry.trim()).filter(Boolean)) {
    const whole = resolveFilter(group);
    if (whole) {
      if (!targets.includes(whole)) targets.push(whole);
      continue;
    }

    for (const token of group.split(/\s+/)) {
      const filter = resolveFilter(token);
      if (filter) {
        if (!targets.includes(filter)) targets.push(filter);
      } else {
        invalid.push(token);
      }
    }
  }

  return { targets, invalid };
}

function formatBlacklist(words = []) {
  if (!words.length) return `${UI.inactive} None`;
  let text = words.map(word => code(word)).join(', ');
  if (text.length > 990) text = `${text.slice(0, 987)}...`;
  return text;
}

/**
 * Creates or finds the #onyx-automod channel and stores its id so every
 * AutoMod violation is logged there.
 */
async function ensureAutoModLogChannel(guild) {
  const me = guild.members.me;
  if (!me) return null;

  let channel = [...guild.channels.cache.values()].find(c =>
    c.type === ChannelType.GuildText && c.name === 'onyx-automod'
  );

  if (!channel) {
    channel = await guild.channels.create({
      name: 'onyx-automod',
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: me.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]
        }
      ],
      reason: '[Onyx AutoMod] Auto-Moderation log channel'
    }).catch(() => null);
  }

  if (channel) {
    db.setAutoModLogChannel(guild.id, channel.id);
  }

  return channel;
}

function activeCount(current) {
  return FILTERS.filter(filter => current[filter.key]).length;
}

// Grouped so the panel reads as three short columns instead of nine loose
// fields. No emoji: state is written out.
const FILTER_GROUPS = [
  {
    name: 'Content',
    keys: ['antiSpam', 'antiCaps', 'antiEmojiSpam']
  },
  {
    name: 'Links',
    keys: ['antiLink', 'antiInvite', 'antiNsfwLink']
  },
  {
    name: 'Abuse',
    keys: ['antiMassMention', 'antiExternalApps', 'antiTokenSpam']
  }
];

function filterLine(current, key) {
  const filter = FILTERS.find(entry => entry.key === key);
  if (!filter) return null;
  return `${filter.name} ${UI.separator} ${current[key] ? 'Active' : 'Off'}`;
}

// Receipt block naming the modules a change touched.
function changeText(entries) {
  const on = entries.filter(entry => entry.enabled).map(entry => entry.filter.name);
  const off = entries.filter(entry => !entry.enabled).map(entry => entry.filter.name);
  const hint = 'Run `/automod status` to review modules, filters and the blacklist.';

  if (on.length && off.length) {
    return [
      '**AutoMod modules updated**',
      `Enabled ${UI.separator} ${on.join(', ')}`,
      `Disabled ${UI.separator} ${off.join(', ')}`,
      muted(hint),
      `-# Onyx Security ${UI.separator} AutoMod`
    ].join('\n');
  }

  const enabled = on.length > 0;
  const names = enabled ? on : off;

  return receiptText({
    marker: false,
    active: enabled,
    headline: names.length === 1
      ? `${names[0]} has been ${enabled ? 'enabled' : 'disabled'}`
      : `AutoMod has been ${enabled ? 'enabled' : 'disabled'}`,
    lines: names.length > 1 ? [names.join(` ${UI.separator} `)] : [],
    hint,
    source: 'AutoMod'
  });
}

function statusEmbed(current, notice) {
  const active = activeCount(current);
  const blacklist = current.blacklist || [];
  const color = active === FILTERS.length
    ? config.colors.crimson
    : active === 0
      ? config.colors.info
      : config.colors.warning;

  const fields = FILTER_GROUPS.map(group => ({
    name: group.name,
    value: group.keys.map(key => filterLine(current, key)).filter(Boolean).join('\n'),
    inline: true
  }));

  fields.push({ name: 'Blacklisted words', value: formatBlacklist(blacklist), inline: false });

  return securityEmbed({
    title: 'AutoMod',
    description: [
      ...(notice ? [notice, ''] : []),
      `**${active} of ${FILTERS.length}** filters active`,
      muted('Choose filters from the drop-down to toggle them, or use the actions below.')
    ].join('\n'),
    color,
    fields,
    footer: { text: `AutoMod ${UI.separator} ${active}/${FILTERS.length}` }
  });
}

function filterSelectRow(current) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('automod_filters')
      .setPlaceholder('Select filters to toggle')
      .setMinValues(1)
      .setMaxValues(FILTERS.length)
      .addOptions(FILTERS.map(filter => ({
        label: filter.name,
        description: current[filter.key] ? 'Active · choose to disable' : 'Off · choose to enable',
        value: filter.slug
      })))
  );
}

function actionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('automod_enable')
      .setLabel('Enable all')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('automod_disable')
      .setLabel('Disable all')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('automod_refresh')
      .setLabel('Refresh')
      .setStyle(ButtonStyle.Secondary)
  );
}

function panelPayload(guild, notice) {
  const current = db.getAutoMod(guild.id);
  return {
    embeds: [statusEmbed(current, notice)],
    components: [filterSelectRow(current), actionRow()]
  };
}

function usageText(prefix) {
  return [
    'Enable or disable every filter at once, or name the ones you want.',
    UI.divider,
    `${code(`${prefix}automod enable`)}`,
    `${code(`${prefix}automod disable`)}`,
    `${code(`${prefix}automod enable caps, spam`)}`,
    `${code(`${prefix}automod status`)}`,
    `${code(`${prefix}automod blacklist add word`)}`,
    `${code(`${prefix}automod blacklist remove word`)}`,
    '',
    `Filters ${UI.separator} ${FILTERS.map(filter => code(filter.slug)).join(', ')}`
  ].join('\n');
}

function usageEmbed(prefix) {
  return securityEmbed({
    title: 'AutoMod usage',
    description: usageText(prefix)
  });
}

function filterOption(option) {
  return option
    .setName('filter')
    .setDescription('Filter to change (omit to change all filters)')
    .setRequired(false)
    .addChoices(
      { name: 'All filters', value: 'all' },
      ...FILTERS.map(filter => ({ name: filter.name, value: filter.slug }))
    );
}

const builder = new SlashCommandBuilder()
  .setName('automod')
  .setDescription('Configures automated moderation filters.')
  .addSubcommand(sub =>
    sub.setName('enable')
      .setDescription('Enable every filter, or a specific one')
      .addStringOption(filterOption)
  )
  .addSubcommand(sub =>
    sub.setName('disable')
      .setDescription('Disable every filter, or a specific one')
      .addStringOption(filterOption)
  )
  .addSubcommand(sub => sub.setName('status').setDescription('Review the current AutoMod configuration'))
  .addSubcommand(sub =>
    sub.setName('blacklist')
      .setDescription('Manage the auto-delete word blacklist')
      .addStringOption(option =>
        option.setName('action')
          .setDescription('Add or remove a word')
          .setRequired(true)
          .addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' })
      )
      .addStringOption(option => option.setName('word').setDescription('Word to add or remove').setRequired(true))
  );

function setBlacklist(guildId, action, word) {
  const list = db.getAutoMod(guildId).blacklist || [];
  const added = action === 'add';

  if (added) {
    const updated = list.includes(word) ? list : [...list, word];
    db.setAutoMod(guildId, { blacklist: updated });
  } else {
    db.setAutoMod(guildId, { blacklist: list.filter(entry => entry !== word) });
  }

  return securityEmbed({
    title: 'Blacklist updated',
    description: `${added ? 'Added' : 'Removed'} ${code(word)} ${added ? 'to' : 'from'} the blacklist.`
  });
}

async function applyFilters(guild, enabled, targets) {
  const update = {};
  for (const target of targets) update[target.key] = enabled;
  db.setAutoMod(guild.id, update);

  if (enabled) {
    await ensureAutoModLogChannel(guild);
  }
}

function canManage(interaction) {
  return interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
}

module.exports = {
  name: 'automod',
  description: 'Configures automated moderation filters (spam, caps, links, invites, mass mentions, emoji spam, NSFW links, external apps, token spam, blacklist).',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  data: builder,

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'status') {
      return interaction.reply({ ...panelPayload(interaction.guild), flags: MessageFlags.Ephemeral });
    }

    if (sub === 'blacklist') {
      const action = interaction.options.getString('action');
      const word = interaction.options.getString('word').trim().toLowerCase();
      return interaction.reply({
        embeds: [setBlacklist(guildId, action, word)],
        flags: MessageFlags.Ephemeral
      });
    }

    const { targets, invalid } = parseFilters(interaction.options.getString('filter') || '');
    if (invalid.length) {
      return interaction.reply({ embeds: [usageEmbed('/')], flags: MessageFlags.Ephemeral });
    }

    const enabled = sub === 'enable';
    await applyFilters(interaction.guild, enabled, targets);
    return interaction.reply({
      ...panelPayload(interaction.guild, changeText(targets.map(filter => ({ filter, enabled })))),
      flags: MessageFlags.Ephemeral
    });
  },

  async executePrefix(message, args) {
    const prefix = db.getPrefix(message.guild.id, process.env.DEFAULT_PREFIX || config.defaultPrefix || '!');
    const sub = args[0]?.toLowerCase();
    const guildId = message.guild.id;

    if (!sub || sub === 'status' || sub === 'list') {
      return message.reply(panelPayload(message.guild));
    }

    if (sub === 'blacklist') {
      const action = args[1]?.toLowerCase();
      const word = args.slice(2).join(' ').trim().toLowerCase();

      if (!['add', 'remove', 'del'].includes(action) || !word) {
        return message.reply({ embeds: [usageEmbed(prefix)] });
      }

      return message.reply({
        embeds: [setBlacklist(guildId, action === 'add' ? 'add' : 'remove', word)]
      });
    }

    if (sub !== 'enable' && sub !== 'disable') {
      return message.reply({ embeds: [usageEmbed(prefix)] });
    }

    const { targets, invalid } = parseFilters(args.slice(1).join(' '));
    if (invalid.length) {
      return message.reply({
        embeds: [securityEmbed({
          title: 'Unknown filter',
          description: `Unknown filter ${UI.separator} ${invalid.map(token => code(token)).join(', ')}\n\n${usageText(prefix)}`,
          color: config.colors.error
        })]
      });
    }

    const enabled = sub === 'enable';
    await applyFilters(message.guild, enabled, targets);
    return message.reply(panelPayload(
      message.guild,
      changeText(targets.map(filter => ({ filter, enabled })))
    ));
  },

  async handleSelect(interaction) {
    if (!canManage(interaction)) {
      return interaction.reply({
        embeds: [securityEmbed({
          title: 'Not permitted',
          description: 'You need Manage Server to change AutoMod.',
          color: config.colors.error
        })],
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.customId !== 'automod_filters') return false;

    const current = db.getAutoMod(interaction.guild.id);
    const update = {};
    const changed = [];

    for (const value of interaction.values) {
      const filter = FILTERS.find(entry => entry.slug === value);
      if (!filter) continue;

      update[filter.key] = !current[filter.key];
      changed.push({ filter, enabled: update[filter.key] });
    }

    db.setAutoMod(interaction.guild.id, update);

    const anyEnabled = changed.some(entry => entry.enabled);
    if (anyEnabled) {
      await ensureAutoModLogChannel(interaction.guild);
    }

    if (!changed.length) {
      return interaction.update(panelPayload(interaction.guild));
    }

    return interaction.update(panelPayload(interaction.guild, changeText(changed)));
  },

  async handleButton(interaction) {
    if (!canManage(interaction)) {
      return interaction.reply({
        embeds: [securityEmbed({
          title: 'Not permitted',
          description: 'You need Manage Server to change AutoMod.',
          color: config.colors.error
        })],
        flags: MessageFlags.Ephemeral
      });
    }

    const { customId } = interaction;

    if (customId === 'automod_refresh') {
      return interaction.update(panelPayload(interaction.guild));
    }

    if (customId !== 'automod_enable' && customId !== 'automod_disable') {
      return false;
    }

    const enabled = customId === 'automod_enable';
    await applyFilters(interaction.guild, enabled, FILTERS);
    return interaction.update(panelPayload(
      interaction.guild,
      changeText(FILTERS.map(filter => ({ filter, enabled })))
    ));
  }
};
