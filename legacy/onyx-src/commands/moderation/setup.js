const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require('discord.js');
const db = require('../../database');
const { securityEmbed, errorEmbed, bullets, code, UI, muted } = require('../../utils/embeds');
const config = require('../../../config.json');

const sleep = ms => new Promise(res => setTimeout(res, ms));

function introPayload(initiatorId) {
  return {
    embeds: [securityEmbed({
      title: 'Security acceptance',
      description: [
        '**Onyx does not rely on blind trust.**',
        'Traditional anti-nuke bots stop checking users the moment they are whitelisted. Onyx keeps watching.',
        '',
        '**What changes with Onyx**',
        bullets([
          '**Limit System** — trusted staff may perform only a limited number of sensitive actions inside a time window.',
          '**Anti-Betray** — exceeding a limit overrides the whitelist, strips dangerous roles, quarantines the offender, and can lock down the server.',
          '**Precision moderation** — every action is logged with target, moderator, reason, duration, and DM status.'
        ])
      ].join('\n'),
      fields: [
        { name: 'Proceed', value: 'Review the security disclaimer and accept the Terms of Service.', inline: false },
        { name: 'Firewall requirement', value: 'Place the **Onyx Unstoppable Power™** role above all other roles to prevent unauthorized actions.', inline: false }
      ]
    })],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`setup_proceed:${initiatorId}`)
        .setLabel('Proceed')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`setup_stop:${initiatorId}`)
        .setLabel('Stop')
        .setStyle(ButtonStyle.Danger)
    )]
  };
}

function tosPayload(initiatorId) {
  return {
    embeds: [securityEmbed({
      title: 'Security disclaimer and terms',
      description: [
        '**Read before activating Onyx.**',
        bullets([
          'Onyx **cannot guarantee** server security if a nuker holds a role equal to or above Onyx.',
          'Blindly whitelisting a compromised account weakens protection. Anti-Betray helps, but correct role hierarchy is mandatory.',
          'Onyx needs **Administrator**, **Manage Channels**, and **Manage Roles** to contain threats and restore damage.',
          'Server owners are responsible for reviewing whitelist entries and keeping the Onyx role above all others.',
          'By clicking **Agree to TOS** you accept these conditions and authorize Onyx to act during a security incident.'
        ])
      ].join('\n')
    })],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`setup_agree:${initiatorId}`)
        .setLabel('Agree to TOS')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`setup_stop:${initiatorId}`)
        .setLabel('Stop')
        .setStyle(ButtonStyle.Danger)
    )]
  };
}

function cancelPayload() {
  return {
    embeds: [errorEmbed('Security acceptance was cancelled. Onyx will remain in a limited state until `/setup` is completed.')],
    components: []
  };
}

function setupPayload(step) {
  const lines = [
    `${step >= 0 ? UI.active : UI.inactive} Accepted security terms`,
    `${step >= 1 ? UI.active : UI.partial} Jail role & channel`,
    `${step >= 2 ? UI.active : UI.partial} Moderation logs channel`,
    `${step >= 3 ? UI.active : UI.partial} Jail channel overwrites`,
    `${step >= 4 ? UI.active : UI.partial} Limits & Anti-Betray armed`
  ];

  return securityEmbed({
    title: 'Activating security',
    description: [
      muted('Configuring moderation infrastructure.'),
      '',
      bullets(lines)
    ].join('\n')
  });
}

function statusLine(active, text) {
  return `${active ? UI.active : UI.inactive} ${text}`;
}

function checklistEmbed(guild) {
  const antiNuke = db.getAntiNuke(guild.id);
  const limits = db.getLimits(guild.id);
  const betray = db.getAntiBetray(guild.id);
  const antiRaid = db.getAntiRaid(guild.id);
  const autoMod = db.getAutoMod(guild.id);
  const logs = db.getModLogs(guild.id) || { enabled: false, channelId: null };
  const jail = db.getJail(guild.id) || { roleId: null, channelId: null, jailedMembers: {} };
  const setup = db.getSetup(guild.id);

  const automodKeys = [
    'antiSpam', 'antiCaps', 'antiLink', 'antiInvite', 'antiMassMention',
    'antiEmojiSpam', 'antiNsfwLink', 'antiExternalApps', 'antiTokenSpam'
  ];
  const activeFilters = automodKeys.filter(key => autoMod[key]).length;
  const firewallReady = antiNuke.enabled && Boolean(antiNuke.roles?.firewall);

  const lines = [
    statusLine(limits.enabled, '**Limit System** — event thresholds armed'),
    statusLine(betray.enabled, '**Anti-Betray** — whitelist override active'),
    statusLine(Boolean(logs.enabled && logs.channelId), `**Moderation logs** — ${logs.channelId ? `<#${logs.channelId}>` : 'not configured'}`),
    statusLine(Boolean(jail.roleId && jail.channelId), `**Jail system** — ${jail.channelId ? `<#${jail.channelId}>` : 'not configured'}`),
    statusLine(setup.accepted, '**Security acceptance** — recorded'),
    statusLine(firewallReady, `**AntiNuke firewall** — ${firewallReady ? 'enabled' : 'run `/antinuke enable`'}`),
    statusLine(antiRaid.enabled, `**AntiRaid** — ${antiRaid.enabled ? 'enabled' : 'run `/antiraid enable`'}`),
    statusLine(activeFilters > 0, `**AutoMod** — ${activeFilters}/${automodKeys.length} filters active`)
  ];

  const fields = [
    { name: 'Protection layers', value: bullets(lines), inline: false },
    {
      name: 'Firewall reminder',
      value: 'Place the **Onyx Unstoppable Power™** role above all other roles to prevent unauthorized actions.',
      inline: false
    }
  ];

  if (!firewallReady) {
    fields.push({ name: 'Recommended next steps', value: bullets([`Activate the firewall with ${code('/antinuke enable')}.`]), inline: false });
  }

  return securityEmbed({
    title: 'Security activated',
    description: [
      `**${guild.name} is now protected by Onyx.**`,
      'Review the active protection layers below.'
    ].join('\n'),
    fields
  });
}

function supportsOverwrites(channel) {
  return typeof channel.permissionOverwrites?.edit === 'function';
}

module.exports = {
  name: 'setup',
  description: 'Starts the interactive security acceptance flow and configures moderation infrastructure.',
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.Administrator],
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Starts the interactive security acceptance flow and configures moderation infrastructure.'),

  introPayload,
  tosPayload,

  async executeSlash(interaction) {
    return interaction.reply(introPayload(interaction.user.id));
  },

  async executePrefix(message) {
    return message.reply(introPayload(message.author.id));
  },

  async handleButton(interaction) {
    const [action, initiatorId] = interaction.customId.split(':');
    const isAdministrator = interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);

    if (interaction.user.id !== initiatorId && !isAdministrator) {
      return interaction.reply({
        embeds: [errorEmbed('Only the setup initiator or an **Administrator** can control this flow.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (action === 'setup_proceed') {
      return interaction.update(tosPayload(initiatorId));
    }

    if (action === 'setup_stop') {
      return interaction.update(cancelPayload());
    }

    if (action === 'setup_agree') {
      // Acknowledge the component immediately so the button doesn't feel stuck
      await interaction.deferUpdate();

      const me = interaction.guild.members.me;
      if (!me?.permissions.has([PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageChannels])) {
        return interaction.editReply({ embeds: [errorEmbed('I need **Manage Roles** and **Manage Channels** permissions to complete setup.')], components: [] });
      }

      try {
        // Step 1: Jail role & channel
        await interaction.editReply({ embeds: [setupPayload(1)] });
        await sleep(300);

        let jailRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'jailed');
        if (!jailRole) {
          jailRole = await interaction.guild.roles.create({
            name: 'Jailed',
            color: '#2f3136',
            permissions: [],
            reason: '[Onyx Setup] Automated Jail Role'
          });
        }

        let jailChannel = [...interaction.guild.channels.cache.values()].find(channel =>
          channel.type === ChannelType.GuildText && (channel.name === 'onyx-jail' || channel.name === 'jail')
        );
        if (!jailChannel) {
          jailChannel = await interaction.guild.channels.create({
            name: 'onyx-jail',
            type: ChannelType.GuildText,
            permissionOverwrites: [
              { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
              { id: jailRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
              { id: me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
            ],
            reason: '[Onyx Setup] Automated Jail Channel'
          });
        }

        // Step 2: Moderation logs channel
        await interaction.editReply({ embeds: [setupPayload(2)] });
        await sleep(300);

        let modLogs = [...interaction.guild.channels.cache.values()].find(channel =>
          channel.type === ChannelType.GuildText && (channel.name === 'onyx-logs' || channel.name === 'mod-logs')
        );
        if (!modLogs) {
          modLogs = await interaction.guild.channels.create({
            name: 'onyx-logs',
            type: ChannelType.GuildText,
            permissionOverwrites: [
              { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
              { id: me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] }
            ],
            reason: '[Onyx Setup] Automated Mod Logs'
          });
        }

        // Save configs before touching overwrites
        db.setJail(interaction.guild.id, { roleId: jailRole.id, channelId: jailChannel.id });
        db.setModLogs(interaction.guild.id, modLogs.id, true);

        // Step 3: Jail overwrites across all channels
        await interaction.editReply({ embeds: [setupPayload(3)] });
        await sleep(300);

        const overwriteTargets = [...interaction.guild.channels.cache.values()].filter(channel =>
          channel.id !== jailChannel.id && supportsOverwrites(channel)
        );
        for (const channel of overwriteTargets) {
          await channel.permissionOverwrites
            .edit(jailRole, { ViewChannel: false, SendMessages: false, Connect: false })
            .catch(() => {});
        }

        // Step 4: Arm limits + Anti-Betray, accept setup
        await interaction.editReply({ embeds: [setupPayload(4)] });
        await sleep(300);

        db.setLimits(interaction.guild.id, { enabled: true });
        db.setAntiBetray(interaction.guild.id, { enabled: true });
        db.acceptSetup(interaction.guild.id, interaction.user.id);

        return interaction.editReply({ embeds: [checklistEmbed(interaction.guild)], components: [] });
      } catch (err) {
        return interaction.editReply({
          embeds: [errorEmbed(`Setup failed: ${err.message}`)],
          components: []
        });
      }
    }

    return interaction.reply({
      embeds: [errorEmbed('This setup control is no longer available.')],
      flags: MessageFlags.Ephemeral
    });
  }
};
