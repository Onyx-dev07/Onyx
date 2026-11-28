// Onyx Discord Bot
// Author: Onyx

const fs = require('fs');
const path = require('path');
const { REST } = require('discord.js');

const ASSETS_DIR = path.join(__dirname, '..', '..', 'tempassets');
const EMOJIS_PATH = path.join(__dirname, '..', 'emojis.json');
const EMOJI_REGEX = /^<(a?):(\w+):(\d+)>$/;
const SUPPORTED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

function log(message) {
        console.log(`[EmojiSync] ${message}`);
}

function decodeClientId(token) {
        try {
                const decoded = Buffer.from(token.split('.')[0], 'base64').toString('utf8');
                if (/^\d{17,20}$/.test(decoded)) return decoded;
                return null;
        } catch {
                return null;
        }
}

/**
 * Uploads tempassets to the configured Onyx Discord application and rewrites
 * src/emojis.json with the resulting application emoji IDs.
 *
 * This is intentionally manual (`npm run sync:emojis`). It never deletes
 * tempassets and never restarts the process, so Render's health server stays up.
 */
async function runEmojiSync() {
        if (!fs.existsSync(ASSETS_DIR)) {
                log('tempassets/ not found — nothing to sync.');
                return { uploaded: 0, skipped: 0, failed: 0, updated: false };
        }

        const config = require('../config');
        const token = config.BOT_TOKEN;

        if (!token) {
                throw new Error('DISCORD_TOKEN is not set — cannot sync emojis.');
        }

        const clientId = config.CLIENT_ID || decodeClientId(token);
        if (!clientId) {
                throw new Error('CLIENT_ID is not set and could not be decoded from DISCORD_TOKEN.');
        }

        let emojis;
        try {
                emojis = JSON.parse(fs.readFileSync(EMOJIS_PATH, 'utf8'));
        } catch (err) {
                throw new Error(`Failed to read emojis.json: ${err.message}`);
        }

        const imageFiles = fs
                .readdirSync(ASSETS_DIR)
                .filter((file) => SUPPORTED_EXT.has(path.extname(file).toLowerCase()) && !file.startsWith('.'));

        if (!imageFiles.length) {
                log('tempassets/ is empty — nothing to sync.');
                return { uploaded: 0, skipped: 0, failed: 0, updated: false };
        }

        log(`Found ${imageFiles.length} image(s) in tempassets/.`);

        const rest = new REST({ version: '10' }).setToken(token);
        const existingResponse = await rest.get(`/applications/${clientId}/emojis`);
        const appEmojis = Array.isArray(existingResponse) ? existingResponse : existingResponse.items || [];

        const nameToEmoji = {};
        let uploaded = 0;
        let skipped = 0;
        let failed = 0;

        const mimeMap = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.webp': 'image/webp',
                '.gif': 'image/gif',
        };

        for (const file of imageFiles) {
                const ext = path.extname(file).toLowerCase();
                const name = path.basename(file, ext);
                const animated = ext === '.gif';
                const existing = appEmojis.find((emoji) => emoji.name === name);

                if (existing) {
                        nameToEmoji[name] = {
                                id: existing.id,
                                name: existing.name,
                                animated: existing.animated ?? false,
                        };
                        skipped++;
                        continue;
                }

                try {
                        const imageBuffer = fs.readFileSync(path.join(ASSETS_DIR, file));
                        const image = `data:${mimeMap[ext]};base64,${imageBuffer.toString('base64')}`;
                        const created = await rest.post(`/applications/${clientId}/emojis`, {
                                body: { name, image },
                        });

                        nameToEmoji[name] = {
                                id: created.id,
                                name: created.name,
                                animated: created.animated ?? animated,
                        };
                        uploaded++;
                } catch (err) {
                        failed++;
                        log(`Could not upload ${name}: ${err.message}`);
                }
        }

        let updated = false;
        let changed = 0;
        const result = { ...emojis };

        for (const [key, emojiString] of Object.entries(emojis)) {
                const match = emojiString.match(EMOJI_REGEX);
                if (!match) continue;

                const emojiData = nameToEmoji[match[2]];
                if (!emojiData) continue;

                const correct = emojiData.animated
                        ? `<a:${emojiData.name}:${emojiData.id}>`
                        : `<:${emojiData.name}:${emojiData.id}>`;

                if (result[key] !== correct) {
                        result[key] = correct;
                        updated = true;
                        changed++;
                }
        }

        if (updated) {
                fs.writeFileSync(EMOJIS_PATH, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
        }

        log(`Done — ${uploaded} uploaded, ${skipped} skipped, ${failed} failed, ${changed} key(s) rewritten.`);
        return { uploaded, skipped, failed, updated, changed };
}

module.exports = runEmojiSync;
