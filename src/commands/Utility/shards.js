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
import { emoji } from '#emoji';

const pad = (str, len) => String(str).padEnd(len, ' ');

class ShardsCommand extends Command {
        constructor() {
                super({
                        name: 'shards',
                        description: 'Displays the information about the shards',
                        usage: 'shards',
                        aliases: ['shardinfo'],
                        cooldown: 10,
                        enabledSlash: true,
                        slashData: {
                                name: 'shards',
                                description: 'Displays the information about the shards',
                        },
                });
        }

        async execute({ ctx }) {
                const client = ctx.client;
                const botName = client.user.username;

                let shardBlocks = '';

                for (const [, shard] of client.ws.shards) {
                        const shardId = shard.id;
                        const ping = shard.ping >= 0 ? `${shard.ping} ms` : 'N/A';

                        const guilds = client.guilds.cache.filter((g) => g.shardId === shardId);
                        const servers = guilds.size.toLocaleString('en-US');
                        const users = guilds
                                .reduce((acc, g) => acc + g.memberCount, 0)
                                .toLocaleString('en-US');

                        shardBlocks +=
                                `${emoji.shard_online} **Shard ${shardId + 1}**
` +
                                `\`\`\`apache
` +
                                `${pad('Servers', 7)} : ${servers}
` +
                                `${pad('Users', 7)} : ${users}
` +
                                `${pad('Latency', 7)} : ${ping}
` +
                                `\`\`\`
`;
                }

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**${botName}'s Cluster**
### Shards`,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(shardBlocks.trim()),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new ShardsCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */