// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        PermissionFlagsBits,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
} from 'discord.js';
import { db } from '#dbManager';

class GreetChannelsCommand extends Command {
        constructor() {
                super({
                        name: 'greetchannels',
                        description: 'Display all configured greet channels for this server',
                        usage: 'greetchannels',
                        cooldown: 5,
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'greetchannels',
                                description: 'Display all configured greet channels for this server',
                                defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
                        },
                });
        }

        async execute({ ctx }) {
                const configs = await db.guild?.getGreetConfigs(ctx.guild.id);

                const container = new ContainerBuilder().setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('**Greet message**'),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                if (!configs?.length) {
                        container.addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(`No greet channels are configured for this server.
Use \`greetsetup\` to set one up.`),
                        );
                        return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
                }

                for (let i = 0; i < configs.length; i++) {
                        const cfg = configs[i];
                        const deleteAfterText = cfg.deleteAfter ? `${cfg.deleteAfter} second${cfg.deleteAfter === 1 ? '' : 's'}` : 'Never';
                        const message = cfg.type === 'simple'
                                ? (cfg.message ?? 'No message set')
                                : (cfg.description ?? cfg.title ?? 'Container type');

                        container.addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                        `Channel: <#${cfg.channelId}>
` +
                                        `Type: ${cfg.type === 'container' ? 'Container' : 'Simple'}
` +
                                        `Message: \`${message}\`
` +
                                        `Delete after: ${deleteAfterText}`,
                                ),
                        );

                        if (i < configs.length - 1) {
                                container.addSeparatorComponents(
                                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                                );
                        }
                }

                return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
}

export default new GreetChannelsCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */