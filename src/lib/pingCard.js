// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
        ActionRowBuilder,
        ButtonBuilder,
        ButtonStyle,
        ContainerBuilder,
        MessageFlags,
        SectionBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        TextDisplayBuilder,
        ThumbnailBuilder,
} = require('discord.js');

const sequelize = require('../data/sequelize');
const dbStatus = require('../data/dbStatus');
const emojis = require('../emojis.json');
const config = require('../config');

const STATUS = {
        green: {
                key: 'signalGreen',
                title: 'All Systems Operational',
                description: 'Gateway and database are responding normally.',
                color: 0x2ECC71,
                fallback: '📶',
        },
        yellow: {
                key: 'signalYellow',
                title: 'Slight Latency',
                description: 'Everything is online, but responses are slower than usual.',
                color: 0xF1C40F,
                fallback: '📶',
        },
        orange: {
                key: 'signalOrange',
                title: 'Elevated Latency',
                description: 'Services are reachable, but some features may feel slow.',
                color: 0xE67E22,
                fallback: '📶',
        },
        red: {
                key: 'signalRed',
                title: 'Service Degraded',
                description: 'The gateway or database is not responding as expected.',
                color: 0xE74C3C,
                fallback: '📶',
        },
};

function formatMs(value) {
        if (!Number.isFinite(value)) return '—';
        return `${value.toFixed(value >= 100 ? 0 : 1)} ms`;
}

function emojiUrl(value) {
        const match = String(value || '').match(/^<(a?):(\w+):(\d+)>$/);
        if (!match) return null;
        return `https://cdn.discordapp.com/emojis/${match[3]}.${match[1] ? 'gif' : 'png'}`;
}

function pickStatus({ wsLatency, dbOk, dbAverageMs }) {
        if (!dbOk) return STATUS.red;

        const gateway = Number.isFinite(wsLatency) ? Math.max(wsLatency, 0) : 0;
        const database = Number.isFinite(dbAverageMs) ? Math.max(dbAverageMs, 0) : 0;
        const worst = Math.max(gateway, database);

        if (worst <= 500) return STATUS.green;
        if (worst <= 1000) return STATUS.yellow;
        if (worst <= 2000) return STATUS.orange;
        return STATUS.red;
}

async function probeDatabase(sql) {
        const started = Date.now();
        try {
                await sequelize.query(sql);
        } catch {
                return null;
        }

        if (!dbStatus.isDatabaseAvailable()) return null;
        return Date.now() - started;
}

async function buildPingCard(client, roundtripMs) {
        const wsLatency = Number(client?.ws?.ping) || 0;
        let dbOk = dbStatus.isDatabaseAvailable();
        const probes = [];

        if (dbOk) {
                for (const sql of ['SELECT 1', 'SELECT NOW()', 'SELECT 1+1']) {
                        const elapsed = await probeDatabase(sql);
                        probes.push(elapsed);
                        if (elapsed === null) {
                                dbOk = false;
                                break;
                        }
                }
        }

        const dbAverageMs = dbOk && probes.length
                ? probes.reduce((total, value) => total + value, 0) / probes.length
                : null;

        const status = pickStatus({ wsLatency, dbOk, dbAverageMs });
        const signal = emojis[status.key] || status.fallback;
        const signalUrl = emojiUrl(signal);

        const headline = new SectionBuilder()
                .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `## ${status.title}\n${status.description}`
                        )
                );

        if (signalUrl) {
                headline.setThumbnailAccessory(new ThumbnailBuilder().setURL(signalUrl));
        }

        const metrics = [
                `- **Gateway** \`${formatMs(wsLatency)}\``,
                `- **Roundtrip** \`${formatMs(roundtripMs)}\``,
                `- **Database** \`${dbOk ? formatMs(dbAverageMs) : 'Offline'}\``,
        ].join('\n');

        const container = new ContainerBuilder()
                .setAccentColor(status.color)
                .addSectionComponents(headline)
                .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(metrics))
                .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                )
                .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('-# Onyx service health · Support below')
                )
                .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                        .setLabel('Support')
                                        .setStyle(ButtonStyle.Link)
                                        .setURL(config.SUPPORT_SERVER)
                        )
                );

        return {
                components: [container],
                flags: MessageFlags.IsComponentsV2,
        };
}

module.exports = { buildPingCard, pickStatus, STATUS };
