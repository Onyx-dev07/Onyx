import { createCanvas, loadImage } from '@napi-rs/canvas';

// Static ship card: soft pink background, a single heart between the two
// avatars, and the same names, score, meter, and verdict as before. Rendered
// as a PNG so there is no animation loop or GIF encoding.
const WIDTH = 900;
const HEIGHT = 400;
const AVATAR_RADIUS = 82;
const AVATAR_Y = 180;
const LEFT_X = 220;
const RIGHT_X = 680;
const CENTER_X = WIDTH / 2;
const TEXT = '#3d1524';
const MUTED = '#8a4a60';
const ACCENT = '#d6336c';
const ACCENT_LIGHT = '#a61e4d';
const SURFACE = 'rgba(255, 255, 255, 0.55)';

// Avatars are immutable per URL (the hash changes when a user updates it), so
// buffering them for an hour avoids repeat CDN round-trips for popular members.
const AVATAR_TIMEOUT_MS = 2500;
const AVATAR_CACHE_TTL_MS = 60 * 60 * 1000;
const AVATAR_CACHE_LIMIT = 500;
const avatarCache = new Map();
const avatarRequests = new Map();
let backgroundCanvas = null;

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
  const value = String(text ?? '');
  if (ctx.measureText(value).width <= maxWidth) {
    return value;
  }

  let clipped = value;
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped.trimEnd()}…`;
}

function drawBackground(ctx) {
  const surface = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  surface.addColorStop(0, '#ffd3e0');
  surface.addColorStop(0.55, '#ffb3c9');
  surface.addColorStop(1, '#ff8fb1');
  ctx.fillStyle = surface;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= HEIGHT; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  const glow = ctx.createRadialGradient(CENTER_X, 150, 20, CENTER_X, 150, 330);
  glow.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
  glow.addColorStop(0.55, 'rgba(255, 255, 255, 0.16)');
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = ACCENT;
  ctx.fillRect(48, 42, 8, 8);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = TEXT;
  ctx.fillText('ONYX', 68, 52);

  ctx.textAlign = 'right';
  ctx.fillStyle = MUTED;
  ctx.fillText('SHIP METER', WIDTH - 48, 52);

  ctx.strokeStyle = 'rgba(61, 21, 36, 0.18)';
  ctx.beginPath();
  ctx.moveTo(48, 70);
  ctx.lineTo(WIDTH - 48, 70);
  ctx.stroke();
}

function heartPath(ctx, cx, cy, size) {
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 0.35 * s);
  ctx.bezierCurveTo(cx - 0.2 * s, cy - 0.05 * s, cx - s, cy - 0.05 * s, cx - s, cy - 0.55 * s);
  ctx.bezierCurveTo(cx - s, cy - 1.05 * s, cx - 0.45 * s, cy - 1.05 * s, cx, cy - 0.55 * s);
  ctx.bezierCurveTo(cx + 0.45 * s, cy - 1.05 * s, cx + s, cy - 1.05 * s, cx + s, cy - 0.55 * s);
  ctx.bezierCurveTo(cx + s, cy - 0.05 * s, cx + 0.2 * s, cy - 0.05 * s, cx, cy + 0.35 * s);
  ctx.closePath();
}

function drawHeart(ctx, cx, cy, size, percent) {
  ctx.save();
  ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
  ctx.shadowBlur = 28;
  heartPath(ctx, cx, cy, size);

  const fill = ctx.createLinearGradient(0, cy - size / 2, 0, cy + size * 0.35);
  if (percent >= 70) {
    fill.addColorStop(0, '#ff7aa2');
    fill.addColorStop(1, ACCENT);
  } else {
    fill.addColorStop(0, '#c98a9c');
    fill.addColorStop(1, '#9c6474');
  }
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function drawPlaceholderAvatar(ctx, cx, cy, radius, label) {
  const gradient = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.55)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = TEXT;
  ctx.font = `bold ${Math.round(radius * 0.75)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(label || '?').charAt(0).toUpperCase(), cx, cy + 2);
}

function drawAvatar(ctx, avatar, user, cx, percent) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, AVATAR_Y, AVATAR_RADIUS, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (avatar) {
    const diameter = AVATAR_RADIUS * 2;
    const scale = Math.max(diameter / avatar.width, diameter / avatar.height);
    const width = avatar.width * scale;
    const height = avatar.height * scale;
    ctx.drawImage(avatar, cx - width / 2, AVATAR_Y - height / 2, width, height);
  } else {
    drawPlaceholderAvatar(ctx, cx, AVATAR_Y, AVATAR_RADIUS, user?.username);
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, AVATAR_Y, AVATAR_RADIUS + 5, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = percent >= 70 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(61, 21, 36, 0.28)';
  ctx.stroke();
  ctx.restore();
}

function drawName(ctx, user, cx) {
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = TEXT;
  ctx.fillText(fitText(ctx, user?.username || 'Unknown', 310), cx, 304);
}

function drawMeter(ctx, percent) {
  const barX = 270;
  const barY = 326;
  const barWidth = 360;
  const barHeight = 8;

  roundedRect(ctx, barX, barY, barWidth, barHeight, barHeight / 2);
  ctx.fillStyle = SURFACE;
  ctx.fill();

  const filled = Math.max(percent === 0 ? 0 : barHeight, (barWidth * percent) / 100);
  if (filled > 0) {
    roundedRect(ctx, barX, barY, filled, barHeight, barHeight / 2);
    const fill = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    fill.addColorStop(0, ACCENT);
    fill.addColorStop(1, ACCENT_LIGHT);
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

function getCachedAvatar(url) {
  const entry = avatarCache.get(url);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.cachedAt > AVATAR_CACHE_TTL_MS) {
    avatarCache.delete(url);
    return null;
  }
  return entry.buffer;
}

function cacheAvatar(url, buffer) {
  if (avatarCache.size >= AVATAR_CACHE_LIMIT) {
    const oldest = avatarCache.keys().next().value;
    if (oldest !== undefined) {
      avatarCache.delete(oldest);
    }
  }
  avatarCache.set(url, { buffer, cachedAt: Date.now() });
}

async function fetchAvatar(user) {
  try {
    if (!user || typeof user.displayAvatarURL !== 'function') {
      return null;
    }

    const url = user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
    if (!url) {
      return null;
    }

    const cached = getCachedAvatar(url);
    if (cached) {
      return await loadImage(cached);
    }

    let request = avatarRequests.get(url);
    if (!request) {
      request = (async () => {
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(AVATAR_TIMEOUT_MS) });
          if (!response.ok) {
            return null;
          }

          const buffer = Buffer.from(await response.arrayBuffer());
          cacheAvatar(url, buffer);
          return buffer;
        } catch {
          return null;
        } finally {
          avatarRequests.delete(url);
        }
      })();
      avatarRequests.set(url, request);
    }

    const buffer = await request;
    return buffer ? await loadImage(buffer) : null;
  } catch {
    return null;
  }
}

function getBackground() {
  if (!backgroundCanvas) {
    backgroundCanvas = createCanvas(WIDTH, HEIGHT);
    drawBackground(backgroundCanvas.getContext('2d'));
  }
  return backgroundCanvas;
}

function drawCard(ctx, { first, second, percent, name, verdict, firstAvatar, secondAvatar }) {
  ctx.drawImage(getBackground(), 0, 0);

  drawAvatar(ctx, firstAvatar, first, LEFT_X, percent);
  drawAvatar(ctx, secondAvatar, second, RIGHT_X, percent);
  drawHeart(ctx, CENTER_X, 138, 78, percent);

  drawName(ctx, first, LEFT_X);
  drawName(ctx, second, RIGHT_X);

  const score = ctx.createLinearGradient(0, 180, 0, 236);
  score.addColorStop(0, ACCENT);
  score.addColorStop(1, ACCENT_LIGHT);
  ctx.fillStyle = score;
  ctx.font = 'bold 50px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${percent}%`, CENTER_X, 232);

  ctx.font = '600 16px sans-serif';
  ctx.fillStyle = MUTED;
  ctx.fillText(fitText(ctx, name, 340), CENTER_X, 260);

  drawMeter(ctx, percent);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(61, 21, 36, 0.72)';
  ctx.fillText(fitText(ctx, verdict, 720), CENTER_X, 372);
}

async function createShipCard({ first, second, percent, name, verdict }) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  const [firstAvatar, secondAvatar] = await Promise.all([
    fetchAvatar(first),
    fetchAvatar(second),
  ]);

  drawCard(ctx, {
    first,
    second,
    percent,
    name,
    verdict,
    firstAvatar,
    secondAvatar,
  });

  return canvas.encode('png');
}

export { createShipCard, WIDTH, HEIGHT };
