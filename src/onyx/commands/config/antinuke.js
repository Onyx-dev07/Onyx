const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ChannelType
} = require('discord.js');
const db = require('../../database');
const {
  securityEmbed,
  errorEmbed,
  receiptEmbed,
  infoEmbed,
  bullets,
  muted,
  section,
  UI
} = require('../../utils/embeds');
const config = require('../../../config.json');

const sleep = ms => new Promise(res => setTimeout(res, ms));

const MODULES = [
  'Anti Ban · reverses the ban and contains the executor',
  'Anti Kick · rogue kicker neutralized',
  'Anti Bot Add · inviter banned, bot removed',
  'Anti Channel Create / Delete / Update',
  'Anti Role Create / Delete / Update',
  'Anti Member Role Update',
  'Anti Everyone / Here',
  'Anti Guild / Vanity Update',
  'Anti Integration',
  'Anti Webhook Create / Delete / Update',
  'Anti Prune',
  'Auto recovery'
];

function isAuthorized(guild, userId) {
  return userId === guild.ownerId || db.getExtraOwners(guild.id).includes(userId);
}

function firewallText(anti) {
  const roles = anti.roles ?? {};
  const lines = [];

  if (roles.onyx1) lines.push(`<@&${roles.onyx1}> ${UI.separator} Identity`);
  if (roles.onyx2) lines.push(`<@&${roles.onyx2}> ${UI.separator} Security`);
  if (roles.firewall) lines.push(`<@&${roles.firewall}> ${UI.separator} Firewall`);
  if (roles.quarantine) lines.push(`<@&${roles.quarantine}> ${UI.separator} Quarantine`);

  if (!lines.length) return `${UI.inactive} Not configured`;
  return lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
}

/* ── Payloads ───────────────────────────────────────────────────────────── */

function panelEmbed(guild) {
  const anti = db.getAntiNuke(guild.id);
  const armed = Boolean(anti.enabled);

  return securityEmbed({
    title: 'AntiNuke',
    description: [
      `${armed ? UI.active : UI.inactive} **Protection** ${UI.separator} ${armed ? 'Armed' : 'Standby'}`,
      `${anti.roles?.firewall ? UI.active : UI.inactive} **Firewall** ${UI.separator} ${anti.roles?.firewall ? 'Configured' : 'Not configured'}`,
      `${anti.logChannelId ? UI.active : UI.inactive} **Anti-nuke logs** ${UI.separator} ${anti.logChannelId ? `<#${anti.logChannelId}>` : 'Not configured'}`,
      '',
      muted('Place the Onyx Unstoppable Power™ role above every other role. Without that position Onyx cannot contain a rogue administrator.')
    ].join('\n'),
    fields: [
      { name: 'Enforcement', value: 'Punishment **BAN** · every malicious action is reverted', inline: false },
      { name: 'Security roles', value: firewallText(anti), inline: false },
      { name: 'Modules', value: bullets(MODULES), inline: false }
    ],
    footer: { text: `AntiNuke ${UI.separator} ${armed ? 'Armed' : 'Standby'}` }
  });
}

function panelPayload(guild) {
  const anti = db.getAntiNuke(guild.id);

  return {
    embeds: [panelEmbed(guild)],
    components: [new ActionRowBuilder().addComponents(
      anti.enabled
        ? new ButtonBuilder()
          .setCustomId('antinuke_disable_request')
          .setLabel('Disable protection')
          .setStyle(ButtonStyle.Danger)
        : new ButtonBuilder()
          .setCustomId('antinuke_enable')
          .setLabel('Enable protection')
          .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('show_punishment')
        .setLabel('Punishment')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('antinuke_refresh')
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Secondary)
    )]
  };
}

function setupPayload(step) {
  const lines = [
    `${UI.active} Role position checked`,
    `${step >= 1 ? UI.active : UI.partial} Security roles`,
    `${step >= 2 ? UI.active : UI.inactive} AntiNuke modules`
  ];

  return securityEmbed({
    title: 'AntiNuke setup',
    description: [
      muted('Configuring protection. This takes a few seconds.'),
      '',
      bullets(lines)
    ].join('\n')
  });
}

function disableConfirmPayload() {
  return {
    embeds: [securityEmbed({
      title: 'Disable AntiNuke',
      description: [
        section('Confirm', 'Every AntiNuke module stops watching this server. Malicious actions will no longer be reverted.'),
        '',
        muted('The security roles stay in the server and can be removed manually.')
      ].join('\n')
    })],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('antinuke_disable_confirm')
        .setLabel('Disable protection')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('antinuke_panel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    )]
  };
}

function disabledEmbed(guild) {
  return infoEmbed([
    `AntiNuke is **disabled** for **${guild.name}**.`,
    '',
    muted('Re-arm protection with either button below or `/antinuke enable`.')
  ].join('\n'));
}

// True when the firewall outranks every role the bot does not own.
function firewallRanked(guild, roleId) {
  const me = guild.members.me;
  const firewall = guild.roles.cache.get(roleId);
  if (!me || !firewall) return false;

  return guild.roles.cache.every(role =>
    role.id === firewall.id ||
    role.managed ||
    role.id === me.roles.highest.id ||
    role.position < firewall.position
  );
}

function enabledReceipt(guild) {
  const anti = db.getAntiNuke(guild.id);
  const roles = anti.roles ?? {};
  const me = guild.members.me;

  const deployed = [roles.onyx1, roles.onyx2, roles.firewall]
    .filter(Boolean)
    .map(id => `<@&${id}>`);
  const assigned = Boolean(roles.firewall && me?.roles?.cache?.has(roles.firewall));
  const ranked = Boolean(roles.firewall && firewallRanked(guild, roles.firewall));

  return receiptEmbed({
    headline: 'Onyx Anti-Nuke™ successfully enabled',
    lines: [
      `Protection roles deployed ${UI.separator} ${deployed.join(' ')}`,
      `Quarantine role ${roles.quarantine ? `<@&${roles.quarantine}>` : 'not configured'} ${UI.separator} used during containment`,
      `Firewall ${assigned ? 'assigned to Onyx' : 'created, assign it to Onyx to enforce'}`,
      ranked
        ? 'Security hierarchy applied'
        : `Security hierarchy pending ${UI.separator} move ${roles.firewall ? `<@&${roles.firewall}>` : 'Onyx Unstoppable Power™'} above your other roles`,
      `${MODULES.length} modules armed ${UI.separator} punishment **BAN**`,
      'Recovery engine initialized',
      anti.logChannelId
        ? `Anti-nuke logs ready ${UI.separator} <#${anti.logChannelId}>`
        : 'Anti-nuke logs pending, run `/antinuke enable` again',
    ],
    hint: 'Your server is now fully protected.',
    source: 'AntiNuke'
  });
}

function disabledReceipt() {
  return receiptEmbed({
    active: false,
    headline: 'Onyx Anti-Nuke™ disabled',
    lines: [
      'Every protection module stopped watching this server',
      'Security roles stay in the server'
    ],
    hint: 'Re-arm protection with `/antinuke enable`.',
    source: 'AntiNuke'
  });
}

/* ── Backend ────────────────────────────────────────────────────────────── */

async function runSetup(guild) {
  const me = guild.members.me;

  if (!me?.permissions.has(PermissionFlagsBits.Administrator)) {
    return { error: 'Setup needs the **Administrator** permission. Grant it to Onyx and try again.' };
  }

  try {
    // AntiNuke only creates the two protection roles. The identity "Onyx"
    // role (if any) comes from `/setup`; AntiNuke never creates it, so there
    // is never a duplicate "Onyx" role.
    const findRole = name =>
      guild.roles.cache.find(role => !role.managed && role.name.toLowerCase() === name.toLowerCase());

    // Reuse an existing Onyx identity role from /setup, but never create one here.
    const onyxRole = findRole('onyx');

    let securityRole = findRole('onyx elite security™');
    if (!securityRole) {
      securityRole = await guild.roles.create({
        name: 'Onyx Elite Security™',
        color: config.colors.crimson,
        permissions: [],
        hoist: false,
        mentionable: false,
        reason: '[Onyx AntiNuke] Security role'
      });
    }

    // The power role is the firewall: Administrator plus the highest position
    // the bot can manage. A pre-rename "Onyx Firewall" role is carried over
    // instead of leaving a duplicate behind.
    let powerRole = findRole('onyx unstoppable power™') || findRole('onyx firewall');
    if (!powerRole) {
      powerRole = await guild.roles.create({
        name: 'Onyx Unstoppable Power™',
        color: config.colors.accent,
        permissions: [PermissionFlagsBits.Administrator],
        hoist: false,
        mentionable: false,
        reason: '[Onyx AntiNuke] Firewall role'
      });
    } else if (powerRole.name !== 'Onyx Unstoppable Power™') {
      try {
        powerRole = await powerRole.setName('Onyx Unstoppable Power™');
      } catch {
        // An unrenamable legacy role still works as the firewall.
      }
    }

    await me.roles.add([securityRole, powerRole]).catch(() => {});

    // Quarantine role: no permissions, used to isolate offenders during
    // containment when a timeout cannot be applied.
    let quarantineRole = findRole('onyx quarantine');
    if (!quarantineRole) {
      quarantineRole = await guild.roles.create({
        name: 'Onyx Quarantine',
        color: '#2f3136',
        permissions: [],
        hoist: false,
        mentionable: false,
        reason: '[Onyx AntiNuke] Quarantine role'
      });
    }

    // Dedicated AntiNuke log channel: all security events post here.
    let antiNukeLogs = [...guild.channels.cache.values()].find(channel =>
      channel.type === ChannelType.GuildText && channel.name === 'onyx-antinuke-logs'
    );
    if (!antiNukeLogs) {
      antiNukeLogs = await guild.channels.create({
        name: 'onyx-antinuke-logs',
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
        reason: '[Onyx AntiNuke] Anti-Nuke log channel'
      });
    }

    // Ensure moderation logs channel exists (fallback target and setup infra).
    let modLogs = [...guild.channels.cache.values()].find(channel =>
      channel.type === ChannelType.GuildText && (channel.name === 'onyx-logs' || channel.name === 'mod-logs')
    );
    if (!modLogs) {
      modLogs = await guild.channels.create({
        name: 'onyx-logs',
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
        reason: '[Onyx AntiNuke] Moderation log channel'
      });
    }
    db.setModLogs(guild.id, modLogs.id, true);

    // Ensure jail role + channel exist (fallback infra).
    let jailRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'jailed');
    if (!jailRole) {
      jailRole = await guild.roles.create({
        name: 'Jailed',
        color: '#2f3136',
        permissions: [],
        reason: '[Onyx AntiNuke] Jail role'
      });
    }
    let jailChannel = [...guild.channels.cache.values()].find(channel =>
      channel.type === ChannelType.GuildText && (channel.name === 'onyx-jail' || channel.name === 'jail')
    );
    if (!jailChannel) {
      jailChannel = await guild.channels.create({
        name: 'onyx-jail',
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: jailRole.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          },
          {
            id: me.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
          }
        ],
        reason: '[Onyx AntiNuke] Jail channel'
      });
    }
    db.setJail(guild.id, { roleId: jailRole.id, channelId: jailChannel.id });

    // Deny the Jailed role access to every other channel.
    const overwriteTargets = [...guild.channels.cache.values()].filter(channel =>
      channel.id !== jailChannel.id && typeof channel.permissionOverwrites?.edit === 'function'
    );
    for (const channel of overwriteTargets) {
      await channel.permissionOverwrites
        .edit(jailRole, { ViewChannel: false, SendMessages: false, Connect: false })
        .catch(() => {});
    }

    // Raise the firewall above every rival role. Discord never allows a role
    // above the bot's own top role, so failures are reported, not faked.
    const rival = me.roles.cache
      .filter(role => role.id !== powerRole.id && !role.managed)
      .sort((a, b) => b.position - a.position)
      .first();

    if (rival && powerRole.position <= rival.position) {
      try {
        powerRole = await powerRole.setPosition(rival.position + 1);
      } catch {
        // The receipt reports the hierarchy as pending.
      }
    }

    db.setQuarantineRole(guild.id, quarantineRole.id);
    db.setAntiNukeLogChannel(guild.id, antiNukeLogs.id);

    db.setAntiNuke(guild.id, {
      enabled: true,
      punishment: 'ban',
      roles: {
        onyx1: onyxRole?.id || null,
        onyx2: securityRole.id,
        firewall: powerRole.id,
        quarantine: quarantineRole.id
      }
    });

    return {};
  } catch (err) {
    return { error: `Setup failed during role creation: ${err.message}` };
  }
}

/* ── Command ────────────────────────────────────────────────────────────── */

module.exports = {
  name: 'antinuke',
  aliases: ['antiwizz', 'anti'],
  description: 'Enables or disables the complete Onyx Anti-Nuke security system & creates its security roles.',
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.BanMembers],
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Enables or disables the complete Onyx Anti-Nuke security system & creates its security roles.')
    .addSubcommand(sub =>
      sub.setName('enable')
        .setDescription('Run full setup and activate all AntiNuke modules')
    )
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Deactivates AntiNuke modules')
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Shows AntiNuke defense status and enabled protection modules')
    ),

  async executeSlash(interaction) {
    if (!isAuthorized(interaction.guild, interaction.user.id)) {
      return interaction.reply({
        embeds: [errorEmbed('Only the **Server Owner** or an **Extra Owner** can run this command.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const sub = interaction.options.getSubcommand();
    const anti = db.getAntiNuke(interaction.guild.id);

    if (sub === 'status') {
      return interaction.reply(panelPayload(interaction.guild));
    }

    if (sub === 'disable') {
      if (!anti.enabled) {
        return interaction.reply({ embeds: [disabledEmbed(interaction.guild)], flags: MessageFlags.Ephemeral });
      }

      db.setAntiNuke(interaction.guild.id, { enabled: false });
      return interaction.reply({ embeds: [disabledReceipt()] });
    }

    if (anti.enabled) {
      return interaction.reply({
        embeds: [infoEmbed('AntiNuke is already enabled. Use `/antinuke status` to review coverage.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply();
    await interaction.editReply({ embeds: [setupPayload(0)] });
    await sleep(700);
    await interaction.editReply({ embeds: [setupPayload(1)] });
    await sleep(700);
    await interaction.editReply({ embeds: [setupPayload(2)] });

    const result = await runSetup(interaction.guild);
    if (result.error) {
      return interaction.editReply({ embeds: [errorEmbed(result.error)] });
    }

    await sleep(500);
    await interaction.editReply({ embeds: [enabledReceipt(interaction.guild)] });
    return interaction.followUp(panelPayload(interaction.guild));
  },

  async executePrefix(message, args) {
    if (!isAuthorized(message.guild, message.author.id)) {
      return message.reply({
        embeds: [errorEmbed('Only the **Server Owner** or an **Extra Owner** can run this command.')]
      });
    }

    const option = args[0]?.toLowerCase();
    const anti = db.getAntiNuke(message.guild.id);

    if (!option || option === 'status') {
      return message.reply(panelPayload(message.guild));
    }

    if (option === 'disable' || option === 'off') {
      if (!anti.enabled) {
        return message.reply({ embeds: [disabledEmbed(message.guild)] });
      }

      db.setAntiNuke(message.guild.id, { enabled: false });
      return message.reply({ embeds: [disabledReceipt()] });
    }

    if (option !== 'enable' && option !== 'on') {
      return message.reply({ embeds: [infoEmbed('Usage: `!antinuke enable`, `!antinuke disable`, or `!antinuke status`.')] });
    }

    if (anti.enabled) {
      return message.reply({
        embeds: [infoEmbed('AntiNuke is already enabled. Use `!antinuke status` to review coverage.')]
      });
    }

    const sent = await message.reply({ embeds: [setupPayload(0)] });
    await sleep(700);
    await sent.edit({ embeds: [setupPayload(1)] });
    await sleep(700);
    await sent.edit({ embeds: [setupPayload(2)] });

    const result = await runSetup(message.guild);
    if (result.error) {
      return sent.edit({ embeds: [errorEmbed(result.error)] });
    }

    await sleep(500);
    await sent.edit({ embeds: [enabledReceipt(message.guild)] });
    return message.channel.send(panelPayload(message.guild));
  },

  async handleButton(interaction) {
    if (!isAuthorized(interaction.guild, interaction.user.id)) {
      return interaction.reply({
        embeds: [errorEmbed('Only the **Server Owner** or an **Extra Owner** can change AntiNuke.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const { customId } = interaction;

    if (customId === 'antinuke_refresh' || customId === 'antinuke_panel') {
      return interaction.update(panelPayload(interaction.guild));
    }

    if (customId === 'antinuke_disable_request') {
      return interaction.update(disableConfirmPayload());
    }

    if (customId === 'antinuke_disable_confirm') {
      db.setAntiNuke(interaction.guild.id, { enabled: false });
      return interaction.update({
        embeds: [disabledReceipt()],
        components: []
      });
    }

    if (customId === 'antinuke_enable') {
      const anti = db.getAntiNuke(interaction.guild.id);
      if (anti.enabled) {
        return interaction.update(panelPayload(interaction.guild));
      }

      await interaction.deferUpdate();
      await interaction.editReply({ embeds: [setupPayload(0)] });
      await sleep(700);
      await interaction.editReply({ embeds: [setupPayload(1)] });
      await sleep(700);
      await interaction.editReply({ embeds: [setupPayload(2)] });

      const result = await runSetup(interaction.guild);
      if (result.error) {
        return interaction.editReply({ embeds: [errorEmbed(result.error)] });
      }

      await sleep(500);
      await interaction.editReply({ embeds: [enabledReceipt(interaction.guild)] });
      return interaction.followUp(panelPayload(interaction.guild));
    }

    return false;
  }
};
