// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, SectionBuilder, ThumbnailBuilder, MessageFlags } = require('discord.js');
const os = require('os');
const fs = require('fs');

function pad(key, width = 12) {
    return key + ' '.repeat(Math.max(1, width - key.length));
}

function formatRam(bytes) {
    return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB';
}

async function getCpuUsage() {
    const start = os.cpus().map(c => ({ ...c.times }));
    await new Promise(r => setTimeout(r, 150));
    const end = os.cpus().map(c => ({ ...c.times }));
    let idle = 0, total = 0;
    for (let i = 0; i < start.length; i++) {
        for (const type of Object.keys(start[i])) {
            const diff = end[i][type] - start[i][type];
            total += diff;
            if (type === 'idle') idle += diff;
        }
    }
    return ((1 - idle / total) * 100).toFixed(1);
}

module.exports = {
    name: 'botinfo',
    description: "Shows the bot's info",
    aliases: ['bi'],

    async execute(message) {
        const { client } = message;

        const servers  = client.guilds.cache.size;
        const users    = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
        const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(0);
        const cpuUsage = await getCpuUsage();
        const avatarURL = client.user.displayAvatarURL({ size: 256 });

        let diskFree = 'N/A';
        try {
            const d = fs.statfsSync('/');
            diskFree = (d.bsize * d.bavail / 1e9).toFixed(1) + ' GB Free';
        } catch (_) {}

        const cpuModel = os.cpus()[0]?.model?.trim() ?? 'Unknown';
        const cores    = os.cpus().length;
        const ramTotal = formatRam(os.totalmem());
        let diskTotal  = 'N/A';
        try {
            const d = fs.statfsSync('/');
            diskTotal = (d.bsize * d.blocks / 1e9).toFixed(1) + ' GB';
        } catch (_) {}

        const sysType = `${os.type()} ${os.release()}`;

        const botOverview =
            `### Bot Overview\n` +
            `\`\`\`asciidoc\n` +
            `- ${pad('Servers')}:: ${servers}\n` +
            `- ${pad('Users')}:: ${users.toLocaleString('en-US')}\n` +
            `- ${pad('Clusters')}:: 1\n` +
            `- ${pad('Ram Usage')}:: ${ramUsage} MB\n` +
            `- ${pad('CPU Usage')}:: ${cpuUsage}%\n` +
            `- ${pad('Disk')}:: ${diskFree}\n` +
            `\`\`\``;

        const sysInfo =
            `### System Info\n` +
            `\`\`\`asciidoc\n` +
            `- ${pad('System')}:: ${sysType}\n` +
            `- ${pad('CPU')}:: ${cpuModel}\n` +
            `- ${pad('Cores')}:: ${cores}\n` +
            `- ${pad('Ram')}:: ${ramTotal}\n` +
            `- ${pad('Disk')}:: ${diskTotal}\n` +
            `\`\`\``;

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(botOverview)
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(avatarURL)
                    )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(sysInfo)
            );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */
