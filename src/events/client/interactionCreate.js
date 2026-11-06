const logger = require('../../utils/logger');
const { errorEmbed } = require('../../utils/embeds');
const { channelStatePayload } = require('../../utils/channelActions');
const { handlePagination } = require('../../utils/pagination');
const { MessageFlags, PermissionFlagsBits, PermissionsBitField } = require('discord.js');

// Configuration panels that expose their own component handlers.
const PANEL_COMMANDS = [
  'automod',
  'antinuke',
  'antiraid',
  'logs',
  'welcome',
  'autorole',
  'media',
  'extraowner',
  'customrole',
  'security',
  'giveaway',
  'spamraid',
  'vc'
];

function formatPermissions(permissions) {
  try {
    const names = new PermissionsBitField(permissions).toArray();
    return names.length ? names.join(', ') : 'the required';
  } catch {
    return 'the required';
  }
}

async function reject(interaction, message) {
  const payload = {
    embeds: [errorEmbed(message)],
    flags: MessageFlags.Ephemeral
  };

  if (interaction.deferred && !interaction.replied) {
    return interaction.editReply({ embeds: [errorEmbed(message)] }).catch(() => {});
  }

  if (interaction.replied) {
    return interaction.followUp(payload).catch(() => {});
  }

  return interaction.reply(payload).catch(() => {});
}

function panelCommand(client, customId) {
  const key = customId.split('_')[0];
  if (!PANEL_COMMANDS.includes(key)) return null;
  return client.commands.get(key) || null;
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Every component and modal in this bot belongs to a guild panel. Guard
    // here so a stale DM component cannot dereference a null guild.
    if (!interaction.isChatInputCommand() && !interaction.guild) {
      return reject(interaction, 'This control can only be used in a server.');
    }

    if (interaction.isChatInputCommand()) {
      const command = client.slashCommands.get(interaction.commandName);
      if (!command) {
        return interaction.reply({
          embeds: [errorEmbed(`Command \`/${interaction.commandName}\` was not found.`)],
          flags: MessageFlags.Ephemeral
        });
      }

      // Every command in this bot is server-scoped. Without this guard, DM
      // invocations of globally-registered commands hit a null guild.
      if (!interaction.guild) {
        return reject(interaction, 'This command can only be used in a server.');
      }

      if (command.userPermissions && interaction.guild) {
        if (!interaction.member.permissions.has(command.userPermissions)) {
          return reject(
            interaction,
            `You need ${formatPermissions(command.userPermissions)} permission to run this command.`
          );
        }
      }

      if (command.botPermissions && interaction.guild) {
        if (!interaction.guild.members.me.permissions.has(command.botPermissions)) {
          return reject(
            interaction,
            `I need ${formatPermissions(command.botPermissions)} permission to execute this command.`
          );
        }
      }

      try {
        logger.command(`Slash command /${interaction.commandName} executed by ${interaction.user.tag} in ${interaction.guild?.name || 'DM'}`);
        await command.executeSlash(interaction, client);
      } catch (err) {
        logger.error(`Error executing slash command /${interaction.commandName}:`, err);
        await reject(interaction, 'An unexpected error occurred while executing this command.');
      }
    } else if (interaction.isButton()) {
      const customId = interaction.customId;

      if (await handlePagination(interaction)) return;

      if (customId === 'show_punishment') {
        const { securityEmbed, bullets, muted } = require('../../utils/embeds');
        const embed = securityEmbed({
          title: 'Punishment mode',
          description: [
            '**Enforcement** · BAN',
            '',
            muted('Applies to administrators and any member without a whitelist entry.')
          ].join('\n'),
          fields: [
            {
              name: 'Triggers',
              value: bullets([
                'Ban or kick members',
                'Create, delete, or modify channels',
                'Create, delete, or grant administrative roles',
                'Add unauthorized bots',
                'Create or abuse webhooks'
              ]),
              inline: false
            },
            {
              name: 'Response',
              value: bullets([
                'Offender is banned immediately',
                'Every action is reversed',
                'Alert is posted to the log channel'
              ]),
              inline: false
            }
          ]
        });
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }

      if (customId.startsWith('lock_channel:') || customId.startsWith('unlock_channel:')) {
        if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageChannels)) {
          return reject(interaction, 'You need Manage Channels to use the channel control panel.');
        }

        const [action, channelId] = customId.split(':');
        const channel = interaction.guild?.channels.cache.get(channelId);
        if (!channel) {
          return reject(interaction, 'That channel no longer exists.');
        }

        const state = action === 'lock_channel' ? 'locked' : 'unlocked';

        try {
          await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            SendMessages: state === 'locked' ? false : null
          });
          return interaction.update(channelStatePayload({
            channel,
            moderator: interaction.user,
            state,
            reason: 'Updated from the channel control panel'
          }));
        } catch (err) {
          return reject(interaction, `Failed to ${state === 'locked' ? 'lock' : 'unlock'} channel: ${err.message}`);
        }
      }

      if (customId.startsWith('lock_') || customId.startsWith('unlock_')) {
        const lockCommand = client.slashCommands.get('lock') || client.commands.get('lock');
        if (!lockCommand?.handleButton) {
          return reject(interaction, 'This control is no longer available.');
        }

        try {
          const handled = await lockCommand.handleButton(interaction, client);
          if (handled === false) {
            return reject(interaction, 'This control is no longer available.');
          }
        } catch (err) {
          logger.error('Lock panel failed:', err);
          await reject(interaction, 'Something went wrong while updating the lock panel.');
        }
        return;
      }

      if (customId === 'mod_delete_log') {
        if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageMessages)) {
          return reject(interaction, 'You need Manage Messages to delete this log.');
        }

        // Deleting the log is not itself an acknowledgment, so defer first.
        await interaction.deferUpdate().catch(() => {});
        await interaction.message.delete().catch(() => {});
        return;
      }

      // Command-owned panels: limits, setup, anti-betray, whitelist, help.
      const owners = [
        { match: 'limits_', command: 'limits', label: 'Limit System' },
        { match: 'setup_', command: 'setup', label: 'Security setup' },
        { match: 'antibetray_', command: 'antibetray', label: 'Anti-Betray' },
        { match: 'wl_', command: 'whitelist', label: 'Whitelist' },
        { match: 'help_', command: 'help', label: 'Help' }
      ];

      for (const owner of owners) {
        if (!customId.startsWith(owner.match)) continue;
        const command = client.slashCommands.get(owner.command) || client.commands.get(owner.command);
        if (!command?.handleButton) {
          return reject(interaction, 'This control is no longer available.');
        }

        try {
          const handled = await command.handleButton(interaction, client);
          if (handled === false) {
            return reject(interaction, 'This control is no longer available.');
          }
        } catch (err) {
          logger.error(`${owner.label} panel failed:`, err);
          await reject(interaction, `Something went wrong while updating the ${owner.label.toLowerCase()}.`);
        }
        return;
      }

      const panel = panelCommand(client, customId);
      if (panel?.handleButton) {
        try {
          const handled = await panel.handleButton(interaction, client);
          if (handled === false) {
            return reject(interaction, 'This control is no longer available.');
          }
        } catch (err) {
          logger.error(`Panel ${customId} failed:`, err);
          await reject(interaction, 'Something went wrong while updating this panel.');
        }
        return;
      }

      return reject(interaction, 'This control is no longer available.');
    } else if (interaction.isAnySelectMenu()) {
      const customId = interaction.customId;

      if (customId === 'wl_user' || customId === 'wl_remove' || customId.startsWith('wl_modules:')) {
        const whitelistCommand = client.slashCommands.get('whitelist') || client.commands.get('whitelist');
        if (!whitelistCommand?.handleSelect) {
          return reject(interaction, 'This selector is no longer available.');
        }

        try {
          await whitelistCommand.handleSelect(interaction, client);
        } catch (err) {
          logger.error('Whitelist select menu failed:', err);
          await reject(interaction, 'Something went wrong while updating the whitelist.');
        }
        return;
      }

      const panel = panelCommand(client, customId);
      if (panel?.handleSelect) {
        try {
          const handled = await panel.handleSelect(interaction, client);
          if (handled === false) {
            return reject(interaction, 'This selector is no longer available.');
          }
        } catch (err) {
          logger.error(`Panel ${customId} failed:`, err);
          await reject(interaction, 'Something went wrong while updating this panel.');
        }
        return;
      }

      return reject(interaction, 'This selector is no longer available.');
    } else if (interaction.isModalSubmit()) {
      const panel = panelCommand(client, interaction.customId);
      if (panel?.handleModal) {
        try {
          const handled = await panel.handleModal(interaction, client);
          if (handled === false) {
            return reject(interaction, 'This form is no longer available.');
          }
        } catch (err) {
          logger.error(`Panel modal ${interaction.customId} failed:`, err);
          await reject(interaction, 'Something went wrong while submitting this form.');
        }
        return;
      }

      return reject(interaction, 'This form is no longer available.');
    }
  }
};
