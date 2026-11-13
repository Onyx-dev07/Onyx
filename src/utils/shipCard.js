import { createCanvas, loadImage } from '@napi-rs/canvas';
import gifenc from 'gifenc';

const { GIFEncoder, quantize, applyPalette } = gifenc;

// Animated ship card: charcoal surface, faint grid, one crimson accent, and a
// pulsing heart between the two avatars. Rendered as a looping GIF so the card
// feels alive without any external image service.
const WIDTH = 900;
const HEIGHT = 400;
const AVATAR_RADIUS = 82;
const AVATAR_Y = 180;
const LEFT_X = 220;
const RIGHT_X = 680;
const CENTER_X = WIDTH / 2;
const FRAME_COUNT = 14;
const FRAME_DELAY = 70;
const ACCENT = '#ff8fb1';
const ACCENT_LIGHT = '#f7a8c4';
const TEXT = '#f5f5f7';
const MUTED = '#7c8290';

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

function drawBackground(ctx, phase) {
  const surface = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  surface.addColorStop(0, '#0b0b10');
  surface.addColorStop(0.55, '#13131b');
  surface.addColorStop(1, '#0b0b10');
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

  const pulse = (Math.sin(phase) + 1) / 2;
  const glow = ctx.createRadialGradient(CENTER_X, 150, 20, CENTER_X, 150, 330);
  glow.addColorStop(0, `rgba(255, 143, 177, ${0.16 + pulse * 0.14})`);
  glow.addColorStop(0.55, `rgba(255, 143, 177, ${0.04 + pulse * 0.05})`);
  glow.addColorStop(1, 'rgba(255, 143, 177, 0)');
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

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
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

function drawHeart(ctx, cx, cy, size, percent, phase) {
  const beat = 1 + Math.sin(phase) * 0.08;

  ctx.save();
  ctx.shadowColor = 'rgba(255, 143, 177, 0.65)';
  ctx.shadowBlur = 26 + (Math.sin(phase) + 1) * 12;
  heartPath(ctx, cx, cy, size * beat);

  const fill = ctx.createLinearGradient(0, cy - size / 2, 0, cy + size * 0.35);
  if (percent >= 70) {
    fill.addColorStop(0, ACCENT_LIGHT);
    fill.addColorStop(1, ACCENT);
  } else {
    fill.addColorStop(0, '#b07a8a');
    fill.addColorStop(1, '#7a4252');
  }
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();

  // Small orbiting sparks around the heart.
  for (let i = 0; i < 3; i += 1) {
    const angle = phase + (i * Math.PI * 2) / 3;
    const radius = size * 0.72;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius * 0.7;
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(247, 168, 196, ${0.35 + (Math.sin(phase + i) + 1) * 0.2})`;
    ctx.fill();
  }
}

function drawPlaceholderAvatar(ctx, cx, cy, radius, label) {
  const gradient = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  gradient.addColorStop(0, '#1b1b24');
  gradient.addColorStop(1, '#101017');
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

function drawAvatar(ctx, avatar, user, cx, percent, phase) {
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

  const ringPulse = 1 + Math.sin(phase + 0.6) * 0.02;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, AVATAR_Y, (AVATAR_RADIUS + 5) * ringPulse, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = percent >= 70 ? 'rgba(255, 143, 177, 0.65)' : 'rgba(255, 255, 255, 0.16)';
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
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fill();

  const filled = Math.max(percent === 0 ? 0 : barHeight, (barWidth * percent) / 100);
  if (filled > 0) {
    roundedRect(ctx, barX, barY, filled, barHeight, barHeight / 2);
    const fill = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    fill.addColorStop(0, ACCENT_LIGHT);
    fill.addColorStop(1, ACCENT);
    ctx.fillStyle = fill;
    ctx.fill();
  }
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

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return await loadImage(buffer);
  } catch {
    return null;
  }
}

function drawFrame(ctx, { first, second, percent, name, verdict, firstAvatar, secondAvatar, frame }) {
  const phase = (frame / FRAME_COUNT) * Math.PI * 2;

  drawBackground(ctx, phase);

  drawAvatar(ctx, firstAvatar, first, LEFT_X, percent, phase);
  drawAvatar(ctx, secondAvatar, second, RIGHT_X, percent, phase);
  drawHeart(ctx, CENTER_X, 138, 78, percent, phase);

  drawName(ctx, first, LEFT_X);
  drawName(ctx, second, RIGHT_X);

  const score = ctx.createLinearGradient(0, 180, 0, 236);
  score.addColorStop(0, ACCENT_LIGHT);
  score.addColorStop(1, ACCENT);
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
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.fillText(fitText(ctx, verdict, 720), CENTER_X, 372);
}

async function createShipCard({ first, second, percent, name, verdict }) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  const [firstAvatar, secondAvatar] = await Promise.all([
    fetchAvatar(first),
    fetchAvatar(second),
  ]);

  const gif = GIFEncoder();

  for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
    drawFrame(ctx, {
      first,
      second,
      percent,
      name,
      verdict,
      firstAvatar,
      secondAvatar,
      frame,
    });

    const { data } = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);

    gif.writeFrame(index, WIDTH, HEIGHT, {
      palette,
      delay: FRAME_DELAY,
      ...(frame === 0 ? { repeat: 0 } : {}),
    });
  }

  gif.finish();
  return Buffer.from(gif.bytes());
}

export { createShipCard, WIDTH, HEIGHT };
