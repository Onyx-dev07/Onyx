// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
} from 'discord.js';

const VARIABLES = [
        ['$member_count', 'Server member count'],
        ['$ordinal_member_count', 'Ordinal server member count'],
        ['$inviter_name', "Inviter's name"],
        ['$inviter_mention', 'Mention the inviter'],
        ['$member_name', "Member's name"],
        ['$member', "Member's name and tag"],
        ['$member_mention', 'Mention the member'],
        ['$invites', "Inviter's total invites"],
        ['$inviter_reg_invites', "Inviter's regular invites"],
        ['$fake_invites', "Inviter's fake invites"],
        ['$left_invites', "Inviter's left invites"],
        ['$rejoins', "Inviter's rejoins"],
        ['$guild_name', 'Server name'],
        ['$join_time', 'Member joined at'],
        ['$member_created_at', 'Date and time when a user joined Discord'],
        ['$member_created_ago', 'Relative time since member joined Discord'],
        ['$inviter_created_at', 'Date and time when inviter joined Discord'],
        ['$inviter_created_ago', 'Relative time since inviter joined Discord'],
];

class VariablesCommand extends Command {
        constructor() {
                super({
                        name: 'variables',
                        description: 'List all available invite logger message variables',
                        usage: 'variables',
                        cooldown: 5,
                        enabledSlash: true,
                        slashData: {
                                name: 'variables',
                                description: 'List all available invite logger message variables',
                        },
                });
        }

        async execute({ ctx }) {
                const lines = VARIABLES.map(([v, desc]) => `\`${v}\` : ${desc}`).join('\n');

                const container = new ContainerBuilder().setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('**Invite Logger Variables**'),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(lines),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('-# For custom welcome message'),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new VariablesCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */