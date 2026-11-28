// Onyx Discord Bot
// Author: Onyx

const http = require('node:http');

let server = null;

function sendJson(res, status, body) {
        const payload = JSON.stringify(body);
        res.writeHead(status, {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': Buffer.byteLength(payload),
        });
        res.end(payload);
}

/**
 * Starts a minimal HTTP health server when a PORT is supplied by the host.
 * Render Web Services require the app to bind to $PORT before long-running
 * initialization; background workers do not set it, so no server is started.
 *
 * @returns {import('node:http').Server|null}
 */
function startHealthServer() {
        if (server) return server;

        const rawPort = process.env.PORT;
        if (!rawPort) return null;

        const port = Number(rawPort);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
                console.warn(`[HealthServer] Ignoring invalid PORT value: ${rawPort}`);
                return null;
        }

        server = http.createServer((req, res) => {
                let pathname = '/';
                try {
                        pathname = new URL(
                                req.url || '/',
                                `http://${req.headers.host || 'localhost'}`,
                        ).pathname;
                } catch {
                        pathname = '/';
                }

                if (req.method === 'GET' && ['/', '/health', '/healthz'].includes(pathname)) {
                        sendJson(res, 200, { status: 'ok', service: 'Onyx' });
                        return;
                }

                sendJson(res, 404, { status: 'not_found' });
        });

        server.on('error', (error) => {
                console.error(`[HealthServer] Failed to bind port ${port}: ${error.message}`);
                server = null;
        });

        server.listen(port, '0.0.0.0', () => {
                console.log(`[HealthServer] Listening on 0.0.0.0:${port}`);
        });

        return server;
}

/**
 * Stops the health server if one is running.
 * @returns {Promise<void>}
 */
async function stopHealthServer() {
        if (!server) return;

        const current = server;
        server = null;

        await new Promise((resolve) => {
                current.close(() => resolve());
                current.closeAllConnections?.();
        });
}

module.exports = { startHealthServer, stopHealthServer };
