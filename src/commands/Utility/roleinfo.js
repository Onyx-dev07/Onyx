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

const camelToWords = (str) =>
        str
                .replace(/([A-Z])/g, ' $1')
                .trim()
                .replace(/^./, (c) => c.toUpperCase());

const resolveRole = async (ctx) => {
        if (ctx.isSlash) {
                return ctx.options.getRole('role');
        }

        const arg = ctx.args[0];
        if (!arg) return null;

        const mentionMatch = arg.match(/^<@&(\d+)>$/);
        const id = mentionMatch ? mentionMatch[1] : /^\d{17,20}$/.test(arg) ? arg : null;
        if (!id) return null;

        return ctx.guild.roles.cache.get(id) ?? ctx.guild.roles.fetch(id).catch(() => null);
};

class RoleInfoCommand extends Command {
        constructor() {
                super({
                        name: 'roleinfo',
                        description: "Displays the information about a guild's role",
                        usage: 'roleinfo [@role | roleID]',
                        aliases: ['ri'],
                        cooldown: 5,
                        enabledSlash: true,
                        slashData: {
                                name: 'roleinfo',
                                description: "Displays the information about a guild's role",
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.Role,
                                                name: 'role',
                                                description: 'The role to look up',
                                                required: true,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                const role = await resolveRole(ctx);

                if (!role) {
                        return ctx.reply({
                                content: 'Please provide a valid role mention or role ID.',
                                flags: MessageFlags.Ephemeral,
                        });
                }

                const accentColor = 0xffffff;
                const colorHex = role.color !== 0 ? `#${role.color.toString(16).padStart(6, '0').toUpperCase()}` : 'Default';

                const perms = role.permissions.toArray();
                const permsList =
                        perms.length > 0
                                ? perms.map((p) => camelToWords(p)).join(', ')
                                : 'No permissions';

                const container = new ContainerBuilder();
                container.setAccentColor(accentColor);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**Role info ﹒ ${role.name}**`,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**Role id :** ${role.id}
` +
                                `**Color :** ${colorHex}
` +
                                `**Hoisted :** ${role.hoist ? 'True' : 'False'}
` +
                                `**Position from bottom :** ${role.position}
` +
                                `**Mentionable :** ${role.mentionable ? 'True' : 'False'}`,
                        ),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**Permissions :**
${permsList}`,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `-# Requested by ${ctx.author.username}`,
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new RoleInfoCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */