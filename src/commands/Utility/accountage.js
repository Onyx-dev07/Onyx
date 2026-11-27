// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import { emoji } from '#emoji';
import {
        MessageFlags,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        SectionBuilder,
        ThumbnailBuilder,
        ApplicationCommandOptionType,
} from 'discord.js';

const getAge = (createdAt) => {
        const now = new Date();
        let years   = now.getFullYear() - createdAt.getFullYear();
        let months  = now.getMonth()    - createdAt.getMonth();
        let days    = now.getDate()     - createdAt.getDate();
        let hours   = now.getHours()    - createdAt.getHours();
        let minutes = now.getMinutes()  - createdAt.getMinutes();
        let seconds = now.getSeconds()  - createdAt.getSeconds();

        if (seconds < 0) { seconds += 60; minutes--; }
        if (minutes < 0) { minutes += 60; hours--; }
        if (hours   < 0) { hours   += 24; days--; }
        if (days    < 0) {
                const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                days   += prevMonth.getDate();
                months--;
        }
        if (months  < 0) { months += 12; years--; }

        const weeks = Math.floor(days / 7);
        days = days % 7;

        const parts = [];
        if (years   > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
        if (months  > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
        if (weeks   > 0) parts.push(`${weeks} week${weeks !== 1 ? 's' : ''}`);
        if (days    > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
        if (hours   > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
        if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
        parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);

        return parts.join(', ');
};

const resolveUser = async (ctx) => {
        if (ctx.isSlash) {
                return ctx.options.getUser('user') ?? ctx.user;
        }
        const arg = ctx.args[0];
        if (arg) {
                const idMatch = arg.match(/^<@!?(\d+)>$/) || arg.match(/^(\d{17,20})$/);
                const userId = idMatch ? idMatch[1] : null;
                if (userId) return ctx.client.users.fetch(userId).catch(() => null);
        }
        return ctx.user;
};


class AccountAgeCommand extends Command {
        constructor() {
                super({
                        name: 'accountage',
                        description: "Displays the account age of your account or a user's account",
                        usage: 'accountage [@user | userID]',
                        aliases: ['age', 'accage'],
                        cooldown: 5,
                        enabledSlash: true,
                        slashData: {
                                name: 'accountage',
                                description: "Displays the account age of your account or a user's account",
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.User,
                                                name: 'user',
                                                description: 'The user to check (defaults to yourself)',
                                                required: false,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                const user = await resolveUser(ctx);

                if (!user) {
                        return ctx.reply({
                                content: 'Could not find that user.',
                                flags: MessageFlags.Ephemeral,
                        });
                }

                const avatarURL = user.displayAvatarURL({ size: 256, extension: 'png' });
                const age = getAge(user.createdAt);

                const now = new Date().toLocaleTimeString('en-IN', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata',
                });

                const container = new ContainerBuilder();
                container.setAccentColor(0x000000);

                container.addSectionComponents(
                        new SectionBuilder()
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                                `**${emoji.calendar} ${user.username}'s Account Age**\n${age}`,
                                        ),
                                )
                                .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarURL)),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `-# Requested by ${ctx.author.username} | Today at ${now}`,
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new AccountAgeCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */