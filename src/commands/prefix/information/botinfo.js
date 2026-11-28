// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const os = require('os');
const fs = require('fs');

const { botInfoCard } = require('../../../lib/infoCards');

function formatRam(bytes) {
    return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB';
}

async function getCpuUsage() {
    const start = os.cpus().map(cpu => ({ ...cpu.times }));
    await new Promise(resolve => setTimeout(resolve, 150));
    const end = os.cpus().map(cpu => ({ ...cpu.times }));

    let idle = 0;
    let total = 0;

    for (let index = 0; index < start.length; index++) {
        for (const type of Object.keys(start[index])) {
            const difference = end[index][type] - start[index][type];
            total += difference;
            if (type === 'idle') idle += difference;
        }
    }

    return ((1 - idle / total) * 100).toFixed(1);
}

function diskStats() {
    try {
        const stats = fs.statfsSync(process.cwd());
        return {
            free: (stats.bsize * stats.bavail / 1e9).toFixed(1) + ' GB Free',
            total: (stats.bsize * stats.blocks / 1e9).toFixed(1) + ' GB',
        };
    } catch {
        return { free: 'N/A', total: 'N/A' };
    }
}

module.exports = {
    name: 'botinfo',
    description: "Shows the bot's info",
    aliases: ['bi'],

    async execute(message) {
        const { client } = message;
        const disk = diskStats();
        const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(0);

        const payload = botInfoCard({
            client,
            ramUsage,
            cpuUsage: await getCpuUsage(),
            diskFree: disk.free,
            cpuModel: os.cpus()[0]?.model?.trim() ?? 'Unknown',
            cores: os.cpus().length,
            ramTotal: formatRam(os.totalmem()),
            diskTotal: disk.total,
            sysType: `${os.type()} ${os.release()}`,
            avatarURL: client.user.displayAvatarURL({ size: 256 }),
        });

        return message.reply(payload);
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
