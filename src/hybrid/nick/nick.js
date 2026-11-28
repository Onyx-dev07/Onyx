// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    PermissionFlagsBits,
} = require('discord.js');
const emojis = require('../../emojis.json');

const FOOTER = '-# Nickname management • Onyx';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nick')
        .setDescription('Change or remove a member\'s server nickname')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The member to nickname')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('nickname')
                .setDescription('New nickname (leave empty to remove)')
                .setRequired(false)
        ),

    name: 'nick',
    aliases: ['nickname', 'setnick'],
    description: 'Change or remove a member\'s server nickname',
    category: 'moderation',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isChatInputCommand?.();
        const guild = interactionOrMessage.guild;
        const executor = interactionOrMessage.member;

        function divider(dividerLine = true) {
            return new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(dividerLine);
        }

        function reply(container, ephemeral = false) {
            const opts = {
                components: [container],
                flags: ephemeral
                    ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                    : MessageFlags.IsComponentsV2,
                allowedMentions: { users: [] },
            };
            return interactionOrMessage.reply(opts);
        }

        function errorMsg(text) {
            return new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# ${emojis.nickError} Nickname Update Failed`)
                )
                .addSeparatorComponents(divider())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(text)
                )
                .addSeparatorComponents(divider(false))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(FOOTER)
                );
        }

        if (!guild) {
            return reply(errorMsg('This command can only be used inside a server.'), true);
        }

        if (!executor.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return reply(errorMsg('You need the **Manage Nicknames** permission to use this command.'), true);
        }

        if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return reply(errorMsg('I need the **Manage Nicknames** permission to change nicknames.'), true);
        }

        let targetMember;
        let newNick;

        if (isSlash) {
            const targetUser = interactionOrMessage.options.getUser('user');
            targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
            newNick = interactionOrMessage.options.getString('nickname') ?? null;
        } else {
            const mention = args[0];
            if (!mention) {
                return reply(errorMsg('Please mention a user.\n**Usage:** `nick @user [nickname]`'), true);
            }

            const userId = mention.replace(/[<@!>]/g, '');
            targetMember = await guild.members.fetch(userId).catch(() => null);
            newNick = args.slice(1).join(' ').trim() || null;
        }

        if (!targetMember) {
            return reply(errorMsg('Could not find that member in this server.'), true);
        }

        if (targetMember.id === guild.ownerId) {
            return reply(errorMsg('I cannot change the server owner\'s nickname.'), true);
        }

        if (targetMember.roles.highest.position >= executor.roles.highest.position && executor.id !== guild.ownerId) {
            return reply(errorMsg('You cannot change the nickname of someone with an equal or higher role than yours.'), true);
        }

        if (targetMember.roles.highest.position >= guild.members.me.roles.highest.position) {
            return reply(errorMsg('I cannot change the nickname of someone with an equal or higher role than mine.'), true);
        }

        try {
            await targetMember.setNickname(
                newNick,
                `Nickname changed by ${isSlash ? interactionOrMessage.user.tag : interactionOrMessage.author.tag}`
            );

            const username = targetMember.user?.username || targetMember.displayName || 'Unknown';
            const avatarUrl = typeof targetMember.displayAvatarURL === 'function'
                ? targetMember.displayAvatarURL({ dynamic: true, size: 256 })
                : targetMember.user?.displayAvatarURL({ dynamic: true, size: 256 });

            const details = new TextDisplayBuilder().setContent(
                `${emojis.nickUser} **User:** ${username}\n` +
                `${emojis.nickRight} **Nickname:** ${newNick || 'None'}`
            );

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# ${emojis.nickSuccess} Nickname Updated`)
                )
                .addSeparatorComponents(divider());

            if (avatarUrl) {
                const section = new SectionBuilder()
                    .addTextDisplayComponents(details)
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl));
                container.addSectionComponents(section);
            } else {
                container.addTextDisplayComponents(details);
            }

            container
                .addSeparatorComponents(divider(false))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(FOOTER)
                );

            return reply(container);
        } catch {
            return reply(errorMsg('Failed to change the nickname. Make sure I have the required permissions.'), true);
        }
    }
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */
