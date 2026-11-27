// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        ApplicationCommandOptionType,
} from 'discord.js';

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

class InviteInfoCommand extends Command {
        constructor() {
                super({
                        name: 'inviteinfo',
                        description: "Displays the active invite code(s) of a user in this guild",
                        aliases: ['ii'],
                        cooldown: 5,
                        enabledSlash: true,
                        slashData: {
                                name: 'inviteinfo',
                                description: "Displays the active invite code(s) of a user in this guild",
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.User,
                                                name: 'user',
                                                description: 'User to check (defaults to yourself)',
                                                required: false,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                const target = await resolveTarget(ctx);

                if (!target) {
                        return ctx.reply({ content: 'Could not find that user.' });
                }

                let guildInvites;
                try {
                        guildInvites = await ctx.guild.invites.fetch();
                } catch {
                        return ctx.reply({ content: 'I need the **Manage Guild** permission to view invites.' });
                }

                const userInvites = guildInvites
                        .filter((inv) => inv.inviter?.id === target.id)
                        .sort((a, b) => (b.uses ?? 0) - (a.uses ?? 0));

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**Invite codes of ${target.displayName}**`),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                if (userInvites.size === 0) {
                        container.addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(`No active invites found for ${target.displayName}.`),
                        );
                } else {
                        const lines = userInvites.map(
                                (inv) => `Invite \`${inv.code}\` : \`${inv.uses ?? 0}\` Uses`,
                        );
                        container.addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(lines.join('\n')),
                        );
                }

                await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
}

export default new InviteInfoCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */