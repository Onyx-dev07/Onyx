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

class PermissionsCommand extends Command {
        constructor() {
                super({
                        name: 'permissions',
                        description: 'Displays the information about what permissions the bot requires to function properly',
                        usage: 'permissions',
                        aliases: ['perms', 'botperms'],
                        cooldown: 10,
                        enabledSlash: true,
                        slashData: {
                                name: 'permissions',
                                description: 'Displays the information about what permissions the bot requires to function properly',
                        },
                });
        }

        async execute({ ctx }) {
                const now = new Date().toLocaleTimeString('en-IN', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata',
                });

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `### What permissions do I need to function properly

` +
                                `First basic permissions I need to function properly are \`send messages\`, \`embed links\`, without these I would break
` +
                                `### Invite logging
` +
                                `For invite tracker I need \`manage server\`, \`manage channels\`, \`view audit log\` permissions , these will help me to see the inviter
` +
                                `### Giveaways, polls and timer
` +
                                `For these features to work properly bot needs \`view channel\`, \`send message\`, \`embed links\`, \`add reactions\`, \`use external emoji\`, \`manage messages\`
` +
                                `### Moderation
` +
                                `For moderation bot needs \`kick members\`, \`manage messages\` and \`manage roles\` permissions
` +
                                `### Activities
` +
                                `For this features you need to give the bot \`create invite\` permissions
` +
                                `And for the rest of the features the bot needs \`send message\` and \`embed links\` to work properly`,
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

export default new PermissionsCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */