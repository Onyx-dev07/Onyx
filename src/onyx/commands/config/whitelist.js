const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const db = require('../../database');
const config = require('../../../config.json');
const { paginatedReply } = require('../../utils/pagination');
const {
  securityEmbed,
  successEmbed,
  errorEmbed,
  infoEmbed,
  bullets,
  muted,
  code,
  section,
  UI
} = require('../../utils/embeds');

const modules = [
  { name: 'Anti Ban', value: 'ban', key: 'ban' },
  { name: 'Anti Kick', value: 'kick', key: 'kick' },
  { name: 'Anti Bot Add', value: 'botadd', key: 'botadd' },
  { name: 'Anti Channel Create', value: 'chcr', key: 'chcr' },
  { name: 'Anti Channel Delete', value: 'chdl', key: 'chdl' },
  { name: 'Anti Channel Update', value: 'chup', key: 'chup' },
  { name: 'Anti Role Create', value: 'rlcr', key: 'rlcr' },
  { name: 'Anti Role Delete', value: 'rldl', key: 'rldl' },
  { name: 'Anti Role Update', value: 'rlup', key: 'rlup' },
  { name: 'Anti Member Role Update', value: 'memup', key: 'memup' },
  { name: 'Anti Everyone', value: 'everyone', key: 'everyone' },
  { name: 'Anti Guild Update', value: 'guildup', key: 'guildup' },
  { name: 'Anti Integration', value: 'intg', key: 'intg' },
  { name: 'Anti Webhook', value: 'webhook', key: 'webhook' },
  { name: 'Anti Prune', value: 'prune', key: 'prune' }
];

const PER_PAGE = 8;

function isAuthorized(guild, userId) {
  return userId === guild.ownerId || db.getExtraOwners(guild.id).includes(userId);
}

function moduleLabel(value) {
  return modules.find(module => module.value === value)?.name || value;
}

function describePermissions(permissions = {}) {
  if (permissions.all) return 'All modules';
  const enabled = modules.filter(module => permissions[module.key]);
  return enabled.length ? enabled.map(module => module.name).join(', ') : 'None';
}

function scopeText(values) {
  return values.length === modules.length ? 'All modules' : values.map(moduleLabel).join(', ');
}

function parseModule(input) {
  if (!input) return 'all';
  if (input.toLowerCase() === 'all') return 'all';
  const match = modules.find(module => module.value === input.toLowerCase() || module.key === input.toLowerCase());
  return match ? match.value : null;
}

async function resolveUser(client, input) {
  if (!input) return null;
  const id = String(input).replace(/[<@!>]/g, '');
  if (!/^\d{17,20}$/.test(id)) return null;
  return client.users.fetch(id).catch(() => null);
}

// Encodes the selected modules into a bitmask so the confirm button fits the
// custom id limit even when every module is selected.
function encodeModules(values = []) {
  return values.reduce((mask, value) => {
    const index = modules.findIndex(module => module.value === value);
    return index === -1 ? mask : mask | (1 << index);
  }, 0);
}

function decodeModules(mask) {
  const value = Number(mask) || 0;
  return modules.filter((module, index) => value & (1 << index)).map(module => module.value);
}

function permissionsFor(values) {
  return values.length === modules.length
    ? { all: true }
    : Object.fromEntries(values.map(value => [value, true]));
}

function isExtraOwner(guild, userId) {
  return db.getExtraOwners(guild.id).includes(userId);
}

// Removing an id that is only trusted as an extra owner used to look like a
// silent failure, so say which trust is actually in play.
function notWhitelistedEmbed(guild, userId) {
  return errorEmbed([
    `<@${userId}> is not whitelisted.`,
    ...(isExtraOwner(guild, userId)
      ? ['', muted('They are still trusted as an **Extra Owner**. Revoke that trust with `/extraowner remove`.')]
      : [])
  ].join('\n'));
}

/* ── Components ─────────────────────────────────────────────────────────── */

function userSelectRow() {
  return new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId('wl_user')
      .setPlaceholder('Choose a member to grant access')
      .setMinValues(1)
      .setMaxValues(1)
  );
}

function removeSelectRow(guild, whitelist) {
  const options = Object.keys(whitelist).slice(0, 25).map(id => ({
    label: (guild.members.cache.get(id)?.user?.username || `User ${id.slice(-4)}`).slice(0, 100),
    description: describePermissions(whitelist[id]).slice(0, 100),
    value: id
  }));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('wl_remove')
      .setPlaceholder('Revoke access from a member')
      .addOptions(options)
      .setMinValues(1)
      .setMaxValues(1)
  );
}

function moduleSelectRow(userId, selected = []) {
  const allSelected = selected.length === modules.length;
  const isSelected = value => (allSelected ? value === 'all' : selected.includes(value));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`wl_modules:${userId}`)
      .setPlaceholder('Select the events this member may perform')
      .addOptions([
        { label: 'All modules', description: 'Trust this member for every AntiNuke event', value: 'all', default: isSelected('all') },
        ...modules.map(module => ({
          label: module.name,
          description: `Allow ${module.name.replace(/^Anti /, '')} actions`,
          value: module.value,
          default: isSelected(module.value)
        }))
      ])
      .setMinValues(1)
      .setMaxValues(modules.length + 1)
  );
}

function confirmGrantRow(userId, values) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`wl_confirm:${userId}:${encodeModules(values)}`)
      .setLabel('Confirm')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('wl_cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
  );
}

function confirmRevokeRow(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`wl_revoke:${userId}`)
      .setLabel('Revoke access')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('wl_cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
  );
}

function reopenRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('wl_back')
      .setLabel('Open whitelist')
      .setStyle(ButtonStyle.Secondary)
  );
}

/* ── Payloads ───────────────────────────────────────────────────────────── */

function panelPayload(guild, whitelist) {
  const ids = Object.keys(whitelist);
  const rows = [userSelectRow()];
  if (ids.length) rows.push(removeSelectRow(guild, whitelist));

  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('wl_list')
      .setLabel('View entries')
      .setStyle(ButtonStyle.Secondary)
  ));

  return {
    embeds: [securityEmbed({
      title: 'Whitelist',
      description: [
        `${UI.active} **Trusted members** ${UI.separator} ${code(ids.length)}`,
        muted('Choose a member, then select the events they may perform. Nothing changes until you confirm.'),
        '',
        section('Revoke', muted(`Pick a member in the second menu and confirm. Direct command: ${code('/whitelist remove')}.`))
      ].join('\n')
    })],
    components: rows
  };
}

function grantSelectPayload(userId) {
  return {
    embeds: [securityEmbed({
      title: 'Grant whitelist access',
      description: [
        section('Member', `<@${userId}>`),
        '',
        section('Scope', muted('Select the AntiNuke events this member may perform.')),
        muted('Nothing is granted until you confirm.')
      ].join('\n')
    })],
    components: [moduleSelectRow(userId)]
  };
}

function grantReviewPayload(userId, values) {
  return {
    embeds: [securityEmbed({
      title: 'Confirm whitelist',
      description: [
        section('Member', `<@${userId}>`),
        '',
        muted('Adjust the selection if needed, then confirm. Nothing is granted before confirmation.')
      ].join('\n'),
      fields: [
        { name: 'Scope', value: bullets(values.map(moduleLabel)), inline: false }
      ]
    })],
    components: [moduleSelectRow(userId, values), confirmGrantRow(userId, values)]
  };
}

function revokeReviewPayload(guild, userId, permissions) {
  const description = [
    section('Member', `<@${userId}>`),
    '',
    section('Current scope', describePermissions(permissions)),
    '',
    muted('Confirm to remove this whitelist entry.')
  ];

  if (isExtraOwner(guild, userId)) {
    description.push(
      '',
      section('Note', 'This member is also an **Extra Owner**. That trust is separate — remove it with `/extraowner remove` if it should not remain.')
    );
  }

  return {
    embeds: [securityEmbed({
      title: 'Revoke whitelist',
      description: description.join('\n')
    })],
    components: [confirmRevokeRow(userId)]
  };
}

function listPayload(guild, whitelist, authorId, prefix) {
  const ids = Object.keys(whitelist);

  if (!ids.length) {
    return {
      embeds: [securityEmbed({
        title: 'Whitelist',
        description: [
          `${UI.inactive} No trusted members yet.`,
          muted(`Add one with ${code(`${prefix}wl @user`)} or the panel.`)
        ].join('\n')
      })]
    };
  }

  const pages = [];
  for (let index = 0; index < ids.length; index += PER_PAGE) {
    const chunk = ids.slice(index, index + PER_PAGE);
    pages.push({
      title: 'Whitelist',
      description: [
        `${UI.active} **${ids.length}** ${ids.length === 1 ? 'entry' : 'entries'}`,
        '',
        ...chunk.map(id => [
          `<@${id}>`,
          muted(describePermissions(whitelist[id]))
        ].join('\n'))
      ].join('\n')
    });
  }

  if (pages.length === 1) {
    return { embeds: [securityEmbed({ ...pages[0] })] };
  }

  return paginatedReply({
    authorId,
    pages,
    color: config.colors.accent,
    footerLabel: `Whitelist ${UI.separator} ${guild.name}`
  }).payload;
}

function usageEmbed(prefix) {
  return securityEmbed({
    title: 'Whitelist',
    description: bullets([
      `${code(`${prefix}wl`)} — open the selection panel`,
      `${code(`${prefix}wl @user`)} — choose events, then confirm`,
      `${code(`${prefix}wl add @user ban`)} — grant one module directly`,
      `${code(`${prefix}wl add @user all`)} — grant every module directly`,
      `${code(`${prefix}wl remove @user`)} — revoke access`,
      `${code(`${prefix}wl list`)} — view trusted members`
    ])
  });
}

/* ── Command ────────────────────────────────────────────────────────────── */

module.exports = {
  name: 'whitelist',
  aliases: ['wl'],
  description: 'Manages trusted users across AntiNuke modules with a confirmation panel.',
  userPermissions: [PermissionFlagsBits.Administrator],
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Manages trusted users across AntiNuke modules.')
    .addSubcommand(sub =>
      sub.setName('panel')
        .setDescription('Open the interactive whitelist manager')
    )
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a user to the AntiNuke whitelist')
        .addUserOption(opt => opt.setName('target').setDescription('User to whitelist').setRequired(true))
        .addStringOption(opt =>
          opt.setName('module')
            .setDescription('Module to whitelist for (omit to choose in the panel)')
            .addChoices(...modules.map(module => ({ name: module.name, value: module.value })))
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a user from the AntiNuke whitelist')
        .addUserOption(opt => opt.setName('target').setDescription('User to remove').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('View all whitelisted users in this server')
    ),

  async executeSlash(interaction) {
    if (!isAuthorized(interaction.guild, interaction.user.id)) {
      return interaction.reply({
        embeds: [errorEmbed('Only the server owner or an extra owner can manage the whitelist.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const sub = interaction.options.getSubcommand();
    const whitelist = db.getAntiNuke(interaction.guild.id).whitelist || {};

    if (sub === 'panel') {
      return interaction.reply(panelPayload(interaction.guild, whitelist));
    }

    if (sub === 'add') {
      const target = interaction.options.getUser('target');
      const moduleInput = interaction.options.getString('module');

      // Without an explicit module the member picks events in the panel, so no
      // permission is ever granted blindly.
      if (!moduleInput) {
        return interaction.reply({ ...grantSelectPayload(target.id), flags: MessageFlags.Ephemeral });
      }

      const moduleName = parseModule(moduleInput);
      // Direct adds extend the existing scope; only the panel review replaces it.
      db.addWhitelist(interaction.guild.id, target.id, moduleName === 'all' ? { all: true } : { [moduleName]: true });
      return interaction.reply({
        embeds: [successEmbed(`Whitelisted <@${target.id}> ${UI.separator} ${moduleLabel(moduleName)}`)]
      });
    }

    if (sub === 'remove') {
      const target = interaction.options.getUser('target');
      const entry = whitelist[target.id];

      if (!entry) {
        return interaction.reply({
          embeds: [notWhitelistedEmbed(interaction.guild, target.id)],
          flags: MessageFlags.Ephemeral
        });
      }

      db.removeWhitelist(interaction.guild.id, target.id);
      return interaction.reply({
        embeds: [successEmbed([
          `Removed <@${target.id}> from the whitelist.`,
          '',
          isExtraOwner(interaction.guild, target.id)
            ? muted('This member is still an **Extra Owner**. Revoke that trust with `/extraowner remove`.')
            : muted(`Previous scope ${UI.separator} ${describePermissions(entry)}`)
        ].join('\n'))]
      });
    }

    return interaction.reply(listPayload(interaction.guild, whitelist, interaction.user.id, '/'));
  },

  async executePrefix(message, args) {
    if (!isAuthorized(message.guild, message.author.id)) {
      return message.reply({
        embeds: [errorEmbed('Only the server owner or an extra owner can manage the whitelist.')]
      });
    }

    const prefix = db.getPrefix(message.guild.id, process.env.DEFAULT_PREFIX || config.defaultPrefix || '!');
    const first = args[0]?.toLowerCase();
    const action = ['add', 'set', 'remove', 'del', 'list', 'panel'].includes(first) ? first : null;
    const whitelist = db.getAntiNuke(message.guild.id).whitelist || {};

    if (action === 'panel' || (!action && args.length === 0)) {
      return message.reply(panelPayload(message.guild, whitelist));
    }

    if (action === 'list') {
      return message.reply(listPayload(message.guild, whitelist, message.author.id, prefix));
    }

    // With a keyword the user is args[1]; with the shorthand it is args[0].
    const targetInput = action ? args[1] : args[0];
    const target = message.mentions.users.first() || (await resolveUser(message.client, targetInput));

    if (action === 'remove' || action === 'del') {
      if (!target) {
        return message.reply({
          embeds: [errorEmbed(`Please specify a user: ${code(`${prefix}wl remove @user`)}`)]
        });
      }

      const entry = whitelist[target.id];
      if (!entry) {
        return message.reply({ embeds: [notWhitelistedEmbed(message.guild, target.id)] });
      }

      db.removeWhitelist(message.guild.id, target.id);
      return message.reply({
        embeds: [successEmbed([
          `Removed <@${target.id}> from the whitelist.`,
          '',
          isExtraOwner(message.guild, target.id)
            ? muted('This member is still an **Extra Owner**. Revoke that trust with `/extraowner remove`.')
            : muted(`Previous scope ${UI.separator} ${describePermissions(entry)}`)
        ].join('\n'))]
      });
    }

    if (!target) {
      return message.reply({ embeds: [usageEmbed(prefix)] });
    }

    const moduleInput = action === 'add' || action === 'set' ? args[2] : args[1];
    const moduleName = parseModule(moduleInput);

    if (!moduleName) {
      return message.reply({
        embeds: [errorEmbed(`Unknown module. Available: ${modules.map(module => code(module.value)).join(', ')}`)]
      });
    }

    // No module named: open the selector so events are chosen, never assumed.
    if (!moduleInput) {
      return message.reply(grantSelectPayload(target.id));
    }

    // Direct adds extend the existing scope; only the panel review replaces it.
    db.addWhitelist(message.guild.id, target.id, moduleName === 'all' ? { all: true } : { [moduleName]: true });
    return message.reply({
      embeds: [successEmbed(`Whitelisted <@${target.id}> ${UI.separator} ${moduleLabel(moduleName)}`)]
    });
  },

  async handleButton(interaction, client) {
    if (!isAuthorized(interaction.guild, interaction.user.id)) {
      return interaction.reply({
        embeds: [errorEmbed('Only the server owner or an extra owner can manage the whitelist.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const { customId } = interaction;

    if (customId === 'wl_list') {
      const whitelist = db.getAntiNuke(interaction.guild.id).whitelist || {};
      return interaction.reply({
        ...listPayload(interaction.guild, whitelist, interaction.user.id, '/'),
        flags: MessageFlags.Ephemeral
      });
    }

    if (customId === 'wl_cancel') {
      return interaction.update({
        embeds: [infoEmbed('Whitelist change cancelled. No permissions were modified.')],
        components: [reopenRow()]
      });
    }

    if (customId === 'wl_back') {
      const whitelist = db.getAntiNuke(interaction.guild.id).whitelist || {};
      return interaction.update(panelPayload(interaction.guild, whitelist));
    }

    if (customId.startsWith('wl_confirm:')) {
      const [, userId, mask] = customId.split(':');
      const values = decodeModules(mask);

      if (!values.length) {
        return interaction.update({
          embeds: [errorEmbed('Select at least one module before confirming.')],
          components: []
        });
      }

      db.setWhitelist(interaction.guild.id, userId, permissionsFor(values));

      return interaction.update({
        embeds: [successEmbed([
          `Whitelisted <@${userId}>`,
          '',
          section('Scope', scopeText(values))
        ].join('\n'))],
        components: [reopenRow()]
      });
    }

    if (customId.startsWith('wl_revoke:')) {
      const userId = customId.split(':')[1];
      const whitelist = db.getAntiNuke(interaction.guild.id).whitelist || {};
      const entry = whitelist[userId];

      if (!entry) {
        return interaction.update({
          embeds: [infoEmbed(`<@${userId}> is no longer whitelisted.`)],
          components: [reopenRow()]
        });
      }

      db.removeWhitelist(interaction.guild.id, userId);

      return interaction.update({
        embeds: [successEmbed([
          `Removed <@${userId}> from the whitelist.`,
          '',
          isExtraOwner(interaction.guild, userId)
            ? muted('This member is still an **Extra Owner**. Revoke that trust with `/extraowner remove`.')
            : muted(`Previous scope ${UI.separator} ${describePermissions(entry)}`)
        ].join('\n'))],
        components: [reopenRow()]
      });
    }

    return false;
  },

  async handleSelect(interaction, client) {
    if (!isAuthorized(interaction.guild, interaction.user.id)) {
      return interaction.reply({
        embeds: [errorEmbed('Only the server owner or an extra owner can manage the whitelist.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const { customId } = interaction;

    if (customId === 'wl_user') {
      return interaction.reply({ ...grantSelectPayload(interaction.values[0]), flags: MessageFlags.Ephemeral });
    }

    if (customId.startsWith('wl_modules:')) {
      const userId = customId.split(':')[1];
      const values = interaction.values.includes('all')
        ? modules.map(module => module.value)
        : interaction.values;

      return interaction.update(grantReviewPayload(userId, values));
    }

    if (customId === 'wl_remove') {
      const userId = interaction.values[0];
      const whitelist = db.getAntiNuke(interaction.guild.id).whitelist || {};
      const entry = whitelist[userId];

      if (!entry) {
        return interaction.update({
          embeds: [infoEmbed(`<@${userId}> is no longer whitelisted.`)],
          components: [reopenRow()]
        });
      }

      return interaction.update(revokeReviewPayload(interaction.guild, userId, entry));
    }

    return false;
  }
};
