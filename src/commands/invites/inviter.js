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
import { db } from '#dbManager';

const resolveTarget = async (ctx) => {
        const arg = ctx.isSlash ? null : ctx.args[0];

        if (ctx.isSlash) {
                const user = ctx.options.getUser('user');
                if (!user) return ctx.member;
                return ctx.guild.members.fetch(user.id).catch(() => null);
        }

        if (arg) {
                const idMatch = arg.match(/^<@!?(\d+)>$/) || arg.match(/^(\d{17,20})$/);
                const userId = idMatch ? idMatch[1] : null;
                if (userId) {
                        return ctx.guild.members.fetch(userId).catch(() => null);
                }
        }

        return ctx.member;
};

class InviterCommand extends Command {
        constructor() {
                super({
                        name: 'inviter',
                        description: 'Shows who invited a member to this server',
                        aliases: [],
                        cooldown: 5,
                        enabledSlash: false,
                });
        }

        async execute({ ctx }) {
                const target = await resolveTarget(ctx);

                if (!target) {
                        return ctx.reply({ content: 'Could not find that user.' });
                }

                const record = await db.memberInviter?.get(ctx.guild.id, target.id);

                if (!record || !record.inviterId) {
                        return ctx.reply({
                                content: `Couldn't find the inviter of member ${target.displayName}`,
                        });
                }

                const joinedTs = Math.floor(record.joinedAt / 1000);

                const now = new Date().toLocaleTimeString('en-IN', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata',
                });

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### Inviter information`),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                [
                                        `${target.displayName} was invited by <@${record.inviterId}>`,
                                        `${target.displayName} Joined : <t:${joinedTs}:R>`,
                                ].join('\n'),
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`-# Today at ${now}`),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new InviterCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */