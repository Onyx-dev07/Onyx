// Onyx Discord Bot
// Author: Onyx
import os from 'os';
import { execSync } from 'child_process';
import { Command } from '#command';
import {
        MessageFlags,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        version as djsVersion,
} from 'discord.js';

const fmtBytes = (bytes) => {
        if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB';
        if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + ' MB';
        return (bytes / 1e3).toFixed(2) + ' KB';
};

const getCpuUsage = () =>
        new Promise((resolve) => {
                const start = os.cpus().map((c) => ({ ...c.times }));
                setTimeout(() => {
                        const end = os.cpus();
                        let idle = 0, total = 0;
                        end.forEach((cpu, i) => {
                                for (const type in cpu.times) {
                                        total += cpu.times[type] - start[i][type];
                                }
                                idle += cpu.times.idle - start[i].idle;
                        });
                        resolve(((1 - idle / total) * 100).toFixed(1));
                }, 200);
        });

const getDisk = () => {
        try {
                const line = execSync('df -B1 /').toString().split(`
`)[1].trim().split(/\s+/);
                return {
                        total: parseInt(line[1]),
                        used: parseInt(line[2]),
                        available: parseInt(line[3]),
                };
        } catch {
                return null;
        }
};

class StatsCommand extends Command {
        constructor() {
                super({
                        name: 'stats',
                        description: 'Displays the stats of the bot and its vps',
                        usage: 'stats',
                        aliases: ['botstats'],
                        cooldown: 10,
                        enabledSlash: true,
                        slashData: {
                                name: 'stats',
                                description: 'Displays the stats of the bot and its vps',
                        },
                });
        }

        async execute({ ctx }) {
                const cpuUsage = await getCpuUsage();

                const cpuModel = os.cpus()[0]?.model?.trim() ?? 'Unknown';
                const cores = os.cpus().length;
                const totalMem = os.totalmem();
                const freeMem = os.freemem();
                const usedMem = totalMem - freeMem;

                const disk = getDisk();
                const diskLine = disk
                        ? `Total ${fmtBytes(disk.total)}, Available ${fmtBytes(disk.available)}, Used ${fmtBytes(disk.used)}`
                        : 'Unavailable';

                const totalServers = ctx.client.guilds.cache.size.toLocaleString('en-US');
                const totalUsers = ctx.client.guilds.cache
                        .reduce((acc, g) => acc + g.memberCount, 0)
                        .toLocaleString('en-US');

                const now = new Date().toLocaleTimeString('en-IN', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata',
                });

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**Stats**`),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**Node.js Version**
${process.version}
` +
                                `**Discord.js Version**
${djsVersion}
` +
                                `**Total servers**
${totalServers}
` +
                                `**Total users**
${totalUsers}
` +
                                `**CPU**
${cpuModel}
` +
                                `**Cores**
${cores}
` +
                                `**CPU usage**
${cpuUsage}%
` +
                                `**RAM**
Used : ${fmtBytes(usedMem)}, Available : ${fmtBytes(freeMem)}, Total : ${fmtBytes(totalMem)}
` +
                                `**Storage**
${diskLine}`,
                        ),
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

export default new StatsCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */