// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { createCanvas, loadImage } = require('@napi-rs/canvas');

const CARD_WIDTH = 800;
const CARD_HEIGHT = 420;
const AVATAR_RADIUS = 140;
const BORDER_COLOR = '#ff69b4';
const BACKGROUND_COLOR = '#2B2D31';

function drawCircularAvatar(ctx, image, x, y, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (image) {
    const scale = Math.max((radius * 2) / image.width, (radius * 2) / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
  } else {
    ctx.fillStyle = '#5865F2';
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000000';
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.restore();
}

function drawHeart(ctx, x, y, size) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.35);
  ctx.bezierCurveTo(
    x - size,
    y - size * 0.35,
    x - size * 0.55,
    y - size,
    x,
    y - size * 0.45
  );
  ctx.bezierCurveTo(
    x + size * 0.55,
    y - size,
    x + size,
    y - size * 0.35,
    x,
    y + size * 0.35
  );
  ctx.closePath();
  ctx.fillStyle = BORDER_COLOR;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.restore();
}

async function loadAvatar(url) {
  if (!url) return null;
  try {
    return await loadImage(url);
  } catch (error) {
    console.error('ShipCard avatar load failed:', error.message);
    return null;
  }
}

async function generateShipCard(avatarUrl1, avatarUrl2) {
  const [avatar1, avatar2] = await Promise.all([
    loadAvatar(avatarUrl1),
    loadAvatar(avatarUrl2),
  ]);

  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, CARD_WIDTH - 12, CARD_HEIGHT - 12);

  drawCircularAvatar(ctx, avatar1, 230, CARD_HEIGHT / 2, AVATAR_RADIUS);
  drawCircularAvatar(ctx, avatar2, CARD_WIDTH - 230, CARD_HEIGHT / 2, AVATAR_RADIUS);
  drawHeart(ctx, CARD_WIDTH / 2, CARD_HEIGHT / 2 - 8, 88);

  return canvas.toBuffer('image/png');
}

module.exports = { generateShipCard };
