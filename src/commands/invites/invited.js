// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import { MessageFlags } from 'discord.js';
import { db } from '#dbManager';
import { buildInvitedList } from '#utils';

const resolveTarget = async (ctx) => {
        if (ctx.isSlash) {
                const user = ctx.options.getUser('user');
                if (!user) return ctx.member;
                return ctx.guild.members.fetch(user.id).catch(() => null);
        }

        const arg = ctx.args[0];
        if (arg) {
                const idMatch = arg.match(/^<@!?(\d+)>$/) || arg.match(/^(\d{17,20})$/);
                const userId = idMatch ? idMatch[1] : null;
                if (userId) {
                        return ctx.guild.members.fetch(userId).catch(() => null);
                }
        }

        return ctx.member;
};

class InvitedCommand extends Command {
        constructor() {
                super({
                        name: 'invited',
                        description: 'Shows the list of members invited by a user',
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

                const invited = await db.memberInviter?.getAllByInviter(ctx.guild.id, target.id) ?? [];

                if (invited.length === 0) {
                        return ctx.reply({
                                content: `${target.displayName} has no invites`,
                        });
                }

                const totalPages = Math.max(1, Math.ceil(invited.length / 10));
                const { components } = buildInvitedList(invited, 1, totalPages, ctx.guild.id, target.id, target.displayName, ctx.user.id);

                await ctx.reply({ components, flags: MessageFlags.IsComponentsV2 });
        }
}

export default new InvitedCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */