const { createCanvas, loadImage } = require('@napi-rs/canvas');

// Ship cards follow the same visual language as Onyx embeds: charcoal surface,
// a faint grid, one crimson accent, and typography instead of noise.
const WIDTH = 1000;
const HEIGHT = 440;
const AVATAR_RADIUS = 90;
const AVATAR_Y = 196;
const LEFT_X = 250;
const RIGHT_X = 750;
const CENTER_X = WIDTH / 2;
const CRIMSON = '#dc143c';
const CRIMSON_LIGHT = '#ff5c7a';
const TEXT = '#f2f3f5';
const MUTED = '#8a8f99';

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
  if (ctx.measureText(value).width <= maxWidth) return value;

  let clipped = value;
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped.trimEnd()}…`;
}

function drawBackground(ctx) {
  const surface = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  surface.addColorStop(0, '#0a0b0d');
  surface.addColorStop(0.55, '#111216');
  surface.addColorStop(1, '#0a0b0d');
  ctx.fillStyle = surface;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
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

  const glow = ctx.createRadialGradient(CENTER_X, 170, 20, CENTER_X, 170, 360);
  glow.addColorStop(0, 'rgba(220, 20, 60, 0.20)');
  glow.addColorStop(0.55, 'rgba(220, 20, 60, 0.06)');
  glow.addColorStop(1, 'rgba(220, 20, 60, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Header
  ctx.fillStyle = CRIMSON;
  ctx.fillRect(56, 48, 8, 8);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = TEXT;
  ctx.fillText('ONYX', 76, 58);

  ctx.textAlign = 'right';
  ctx.fillStyle = MUTED;
  ctx.fillText('SHIP METER', WIDTH - 56, 58);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.beginPath();
  ctx.moveTo(56, 80);
  ctx.lineTo(WIDTH - 56, 80);
  ctx.stroke();
}

function drawHeart(ctx, cx, cy, size, percent) {
  const s = size / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(220, 20, 60, 0.55)';
  ctx.shadowBlur = 32;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 0.35 * s);
  ctx.bezierCurveTo(cx - 0.2 * s, cy - 0.05 * s, cx - s, cy - 0.05 * s, cx - s, cy - 0.55 * s);
  ctx.bezierCurveTo(cx - s, cy - 1.05 * s, cx - 0.45 * s, cy - 1.05 * s, cx, cy - 0.55 * s);
  ctx.bezierCurveTo(cx + 0.45 * s, cy - 1.05 * s, cx + s, cy - 1.05 * s, cx + s, cy - 0.55 * s);
  ctx.bezierCurveTo(cx + s, cy - 0.05 * s, cx + 0.2 * s, cy - 0.05 * s, cx, cy + 0.35 * s);
  ctx.closePath();

  const fill = ctx.createLinearGradient(0, cy - s, 0, cy + 0.35 * s);
  if (percent >= 70) {
    fill.addColorStop(0, CRIMSON_LIGHT);
    fill.addColorStop(1, CRIMSON);
  } else {
    fill.addColorStop(0, '#b4545b');
    fill.addColorStop(1, '#7d2731');
  }
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function drawPlaceholderAvatar(ctx, cx, cy, radius, label) {
  const gradient = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  gradient.addColorStop(0, '#2c2f36');
  gradient.addColorStop(1, '#17181c');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
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
  ctx.lineWidth = 2;
  ctx.strokeStyle = percent >= 70 ? 'rgba(220, 20, 60, 0.65)' : 'rgba(255, 255, 255, 0.16)';
  ctx.stroke();
  ctx.restore();
}

function drawName(ctx, user, cx) {
  const maxWidth = 340;
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = TEXT;
  ctx.fillText(fitText(ctx, user?.username || 'Unknown', maxWidth), cx, 328);
}

function drawMeter(ctx, percent) {
  const barX = 300;
  const barY = 352;
  const barWidth = 400;
  const barHeight = 8;

  roundedRect(ctx, barX, barY, barWidth, barHeight, barHeight / 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fill();

  const filled = Math.max(percent === 0 ? 0 : barHeight, (barWidth * percent) / 100);
  if (filled > 0) {
    roundedRect(ctx, barX, barY, filled, barHeight, barHeight / 2);
    const fill = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    fill.addColorStop(0, CRIMSON_LIGHT);
    fill.addColorStop(1, CRIMSON);
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

async function fetchAvatar(user) {
  try {
    if (!user || typeof user.displayAvatarURL !== 'function') return null;
    const url = user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
    if (!url) return null;

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    return await loadImage(buffer);
  } catch {
    return null;
  }
}

/**
 * Renders a ship card PNG with both avatars, a heart, the compatibility score,
 * the generated ship name, and a verdict line.
 */
async function createShipCard({ first, second, percent, name, verdict }) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx);

  const [firstAvatar, secondAvatar] = await Promise.all([
    fetchAvatar(first),
    fetchAvatar(second)
  ]);

  drawAvatar(ctx, firstAvatar, first, LEFT_X, percent);
  drawAvatar(ctx, secondAvatar, second, RIGHT_X, percent);
  drawHeart(ctx, CENTER_X, 150, 84, percent);

  drawName(ctx, first, LEFT_X);
  drawName(ctx, second, RIGHT_X);

  const score = ctx.createLinearGradient(0, 200, 0, 258);
  score.addColorStop(0, CRIMSON_LIGHT);
  score.addColorStop(1, CRIMSON);
  ctx.fillStyle = score;
  ctx.font = 'bold 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${percent}%`, CENTER_X, 252);

  ctx.font = '600 17px sans-serif';
  ctx.fillStyle = MUTED;
  ctx.fillText(fitText(ctx, name, 360), CENTER_X, 282);

  drawMeter(ctx, percent);

  ctx.font = '17px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.fillText(fitText(ctx, verdict, 760), CENTER_X, 402);

  return canvas.toBuffer('image/png');
}

module.exports = { createShipCard, WIDTH, HEIGHT };
