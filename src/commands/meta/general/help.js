// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        ButtonStyle,
        ActionRowBuilder,
        ButtonBuilder,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        StringSelectMenuBuilder,
        StringSelectMenuOptionBuilder,
} from 'discord.js';
import { config } from '#config';
import { emoji } from '#emoji';
import { db } from '#dbManager';
import { disableComponents, logger } from '#utils';

const ACCENT = 0xffffff;

const CATEGORIES = [
        { label: 'Invite Tracking', value: 'invite',     emojiId: '1493486250651287572', emojiName: 'invite',     description: 'Shows the information about invite tracking feature'       },
        { label: 'Messages',        value: 'msg',         emojiId: '1493486259320913941', emojiName: 'msg',         description: 'Shows the information about message counting feature'       },
        { label: 'Giveaways',       value: 'giveaway',    emojiId: '1493486267860648086', emojiName: 'giveaway',    description: 'Shows the information about giveaway feature'               },
        { label: 'Greet',           value: 'greet',       emojiId: '1493486278660853850', emojiName: 'greet',       description: 'Shows you the information about greet welcome feature'      },
        { label: 'Timer',           value: 'timer',       emojiId: '1493486287649374318', emojiName: 'timer',       description: 'Shows you the information about event timer feature'        },
        { label: 'Moderation',      value: 'moderation',  emojiId: '1493486297094946846', emojiName: 'moderation',  description: 'Shows you the information about moderation features'        },
        { label: 'Poll',            value: 'poll',        emojiId: '1493486307052355724', emojiName: 'poll',        description: 'Shows the information about the polls feature'              },
        { label: 'Utility',         value: 'utility',     emojiId: '1493486316388876340', emojiName: 'utility',     description: 'Shows you the information about utility features'           },
        { label: 'Contact',         value: 'contact',     emojiId: '1493486325448314890', emojiName: 'contact',     description: 'Contact us if you need support'                             },
];

const CATEGORY_DATA = {
        invite: {
                title: 'Invite logger / Invite tracker',
                description: 'Tracks and logs the server invites',
                commands: [
                        ['invites',            'Displays the invites stats of a member'],
                        ['inviter',            'Displays the inviter of a server member'],
                        ['invited',            'Displays the invited list of a member'],
                        ['inviteinfo',         'Displays the active invite code(s) of a user in this guild'],
                        ['setjoinchannel',     'Set the welcome channel! All invites welcome message will appear there'],
                        ['addinvites',         'Adds a number of invites to a user!'],
                        ['removeinvites',      'Removes a number of invites from a user!'],
                        ['unsetwelcomechannel','Unset the welcome channel! Note that this command will disable the welcome messages'],
                        ['setleavechannel',    'Sets the member leave channel'],
                        ['unsetleavechannel',  'Unsets the member leave channel! Note that this will disable member leave messages'],
                        ['setjoinmessage',     'Set a custom join message'],
                        ['unsetjoinmessage',   'Deletes your custom join message'],
                        ['setleavemessage',    'Set a custom leave message'],
                        ['unsetleavemessage',  'Deletes your custom leave message'],
                        ['variables',          'Displays the variables so that you can use them in custom welcome message'],
                        ['testmessage',        'Displays your custom join message which you enter as an argument!'],
                        ['clearinvites',       "Removes all the invites entries of a member or of a guild's from my database"],
                        ['resetmyinvites',     "Clears your own invites of a guild"],
                        ['leaderboard invites','Displays the top 10 inviters'],
                ],
        },
        msg: {
                title: 'Messages',
                description: "Keeps the count of users' messages",
                commands: [
                        ['messages',              'Displays the number of messages sent by you or a user'],
                        ['addmessages',           'Adds the specified number of messages to a user'],
                        ['removemessages',        'Removes the specified number of messages to a user'],
                        ['blacklistchannel',      "Blacklists a channel, I won't count messages from that channel"],
                        ['unblacklistchannel',    'Unblacklists a channel'],
                        ['blacklistedchannels',   'Displays the blacklisted channels of a guild'],
                        ['clearmessages',         "Removes all the messages entries of a member or of a guild's from my database"],
                        ['resetmymessages',       'Clears your own messages of a guild'],
                        ['leaderboard messages',  'Displays the top 10 messengers of a guild'],
                        ['leaderboard dailymessages', 'Displays the top 10 daily messengers of a guild'],
                ],
        },
        greet: {
                title: 'Set greet message',
                description: 'You can set greet messages in up to 3 channels with custom messages and auto-delete timers',
                commands: [
                        ['greetsetup',    'Interactive setup to add a greet channel (simple or container style)'],
                        ['greetchannels', 'Displays all configured greet channels and their settings'],
                        ['disablegreet',  'Removes a greet channel config (defaults to current channel)'],
                        ['greetreset',    'Resets all greet settings for this server'],
                        ['greetvariables','Displays the variables that you can use in greet messages'],
                ],
                note: '-# All greet commands require Manage Server permissions except `greetvariables` which is open to all',
        },
        giveaway: {
                title: 'Giveaway',
                description: 'Create giveaways in your Discord server',
                commands: [
                        ['gstart',   'Creates a giveaway'],
                        ['greroll',  'Rerolls an ended giveaway'],
                        ['gend',     'Ends an active giveaway'],
                ],
        },
        moderation: {
                title: 'Moderation',
                commands: [
                        ['kick',   'Kicks a user from a guild'],
                        ['erase',  'Delete a number of messages from a channel'],
                        ['ban',    'Bans a user from a guild'],
                        ['unban',  'Unbans a banned user from a Discord server'],
                        ['mute',   'Mutes a server member for a specified amount of time'],
                        ['unmute', 'Unmutes a server member'],
                        ['nick',   'Changes or clears a member\'s nickname'],
                        ['role',   'Adds, removes, or toggles a member role'],
                ],
        },
        timer: {
                title: 'Timer',
                description: 'Create a timer, pause it, resume it and end it',
                commands: [
                        ['tstart',  'Starts the timer'],
                        ['tpause',  'Pauses an active timer'],
                        ['tresume', 'Resumes a paused timer'],
                        ['tend',    'Ends an active timer'],
                ],
                note: '-# You can enter time like this: `50s` for 50 seconds, `2m` for 2 minutes, `2h` for 2 hours, `1d` for 1 day. If you want to set a timer like 1 day and 12 hours, enter the time in hours format, example: `36h`',
        },
        poll: {
                title: 'Polls',
                description: 'Creates a poll',
                commands: [
                        ['createpoll', 'Create a poll'],
                        ['epoll',      'Ends an active poll'],
                ],
        },
        utility: {
                title: 'Utility',
                description: 'More info on Utility commands of the bot',
                commands: [
                        ['premium',     'Shows information about Onyx Premium'],
                        ['nuke',        'Nukes a TextChannel'],
                        ['serverinfo',  'Displays the information about a server'],
                        ['userinfo',    'Displays the information of a member'],
                        ['roleinfo',    "Displays the information about a guild's role"],
                        ['vcinfo',      'Displays the information about a voice channel'],
                        ['avatar',      'Displays the avatar of a user'],
                        ['banner',      'Displays the banner of a user'],
                        ['guildbanner', "Displays a guild's banner"],
                        ['support',     'Displays the invite link of my support server'],
                        ['membercount', 'Displays the member count of the server'],
                        ['stats',       'Displays the stats of the bot and its vps'],
                        ['shards',      'Displays the information about the shards'],
                        ['permissions', 'Displays the information about what permissions the bot requires to function properly'],
                        ['accountage',  'Displays the account age of your account or a user\'s account'],
                        ['invite',      'Displays the invite links of the bot from which you can invite me in your server'],
                        ['sponsor',     'Displays the information about the sponsors of the bot'],
                        ['uptime',      'Displays the uptime of the bot'],
                        ['botinfo',     'Displays the information about the bot'],
                        ['ping',        'Displays the api latency'],
                        ['setprefix',   "Changes a guild's prefix"],
                        ['deleteprefix',"Resets a guild's prefix to bot's default prefix"],
                ],
        },
        contact: {
                title: 'Contact us',
                description: 'Contact us in case of bug report or feedback or suggestions by joining our **[Support Server](https://discord.gg/QnWNz2dKCE)**',
                commands: [],
        },
};

class HelpCommand extends Command {
        constructor() {
                super({
                        name: 'help',
                        description: 'Browse commands or get info on a specific command',
                        usage: 'help',
                        aliases: ['h', 'cmds', 'commands'],
                        cooldown: 10,
                        enabledSlash: true,
                        slashData: {
                                name: 'help',
                                description: 'Browse commands or get info on a specific command',
                        },
                });
        }

        async execute({ ctx }) {
                const guildPrefixes = await db.guild?.getPrefixes(ctx.guild?.id).catch(() => []);
                const prefix = guildPrefixes?.[0] || config.prefix;

                const container = this._buildMainView(prefix);

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications,
                });

                const message = await ctx.fetchReply();
                this._startCollector(ctx, message, prefix);
        }

        _startCollector(ctx, message, prefix) {
                const collector = message.createMessageComponentCollector({
                        time: 120_000,
                        filter: (i) => {
                                if (i.user.id !== ctx.author.id) {
                                        void i.reply({
                                                content: `${emoji.cross || '❌'} Not your command.`,
                                                flags: MessageFlags.Ephemeral,
                                        }).catch(() => {});
                                        return false;
                                }
                                return true;
                        },
                });

                collector.on('collect', async (interaction) => {
                        try {
                                await interaction.deferUpdate();

                                if (interaction.isStringSelectMenu() && interaction.customId === 'hcatsel') {
                                        const selected = interaction.values[0];
                                        const container = selected === 'index'
                                                ? this._buildMainView(prefix)
                                                : this._buildCategoryView(selected, prefix);
                                        await message.edit({ components: [container] });
                                }
                        } catch (err) {
                                logger.error('Help', 'Interaction error', err);
                        }
                });

                collector.on('end', async () => {
                        try {
                                await disableComponents(message);
                        } catch {}
                });
        }

        _buildSelectMenu() {
                const selectOptions = [
                        new StringSelectMenuOptionBuilder()
                                .setLabel('Index')
                                .setValue('index')
                                .setEmoji({ id: '1493486220242583664', name: 'home' })
                                .setDescription('The help page showing how to use the bot'),
                        ...CATEGORIES.map((cat) =>
                                new StringSelectMenuOptionBuilder()
                                        .setLabel(cat.label)
                                        .setValue(cat.value)
                                        .setEmoji({ id: cat.emojiId, name: cat.emojiName })
                                        .setDescription(cat.description),
                        ),
                ];

                return new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                                .setCustomId('hcatsel')
                                .setPlaceholder('Select a category...')
                                .addOptions(selectOptions),
                );
        }

        _buildButtons() {
                return new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                                .setLabel('Invite me')
                                .setURL(config.links?.invite || 'https://discord.com')
                                .setStyle(ButtonStyle.Link),
                        new ButtonBuilder()
                                .setLabel('Support')
                                .setURL(config.links?.supportServer || 'https://discord.gg/QnWNz2dKCE')
                                .setStyle(ButtonStyle.Link),
                );
        }

        _buildMainView(prefix) {
                const container = new ContainerBuilder();
                container.setAccentColor(ACCENT);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Onyx bot help panel'),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `Hey there, my prefix in this guild is \`${prefix}\`

` +
                                `${emoji.news} **News** ${emoji.news}
` +
                                `${emoji.arrow} Onyx reached 4K Members!
` +
                                `${emoji.arrow} Join Onyx and upgrade your experience.

` +
                                `I can do invite tracking, can manage your server events with greet system, timer, polls and much more! You can checkout my other commands in the context menu!

` +
                                `${emoji.invite}   Invite tracking
` +
                                `${emoji.msg}  Messages
` +
                                `${emoji.giveaway}  Giveaways
` +
                                `${emoji.greet}   Greet
` +
                                `${emoji.timer}   Timer
` +
                                `${emoji.moderation}   Moderation
` +
                                `${emoji.poll}   Poll
` +
                                `${emoji.utility}   Utility
` +
                                `${emoji.contact}   Contact`,
                        ),
                );

                container.addActionRowComponents(this._buildSelectMenu());

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );

                container.addActionRowComponents(this._buildButtons());

                return container;
        }

        _buildCategoryView(category, prefix) {
                const data = CATEGORY_DATA[category];
                if (!data) return this._buildMainView(prefix);

                const container = new ContainerBuilder();
                container.setAccentColor(ACCENT);

                let content = `### ${data.title}`;

                if (data.description) {
                        content += `
${data.description}`;
                }

                if (data.commands?.length) {
                        content += data.description ? `

**Commands**` : '';
                        content += `
` + data.commands
                                .map(([cmd, desc]) => `${emoji.arrow} \`${prefix}${cmd}\` - ${desc}`)
                                .join('\n');
                }

                if (data.note) {
                        content += `

${data.note}`;
                }

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(content),
                );

                container.addActionRowComponents(this._buildSelectMenu());

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );

                container.addActionRowComponents(this._buildButtons());

                return container;
        }
}

export default new HelpCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */