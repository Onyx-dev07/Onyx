// animeActions.js — resolves anime reaction GIFs for fun commands.
//
// nekos.best returns a small batch of GIF URLs per request, so we keep a pool
// and hand out one per command. The pool is warmed at startup, which makes
// `!slap` and `!kiss` feel instant after the first fetch.

const API_BASE = 'https://nekos.best/api/v2';
const BATCH_SIZE = 10;
const REQUEST_TIMEOUT_MS = 4000;

const pools = new Map();
const inflight = new Map();

function normalizeResults(payload) {
  return (payload?.results || [])
    .filter((entry) => entry && typeof entry.url === 'string' && entry.url)
    .map((entry) => ({
      url: entry.url,
      anime: typeof entry.anime_name === 'string' ? entry.anime_name : null,
    }));
}

async function fetchPool(action) {
  const response = await fetch(`${API_BASE}/${action}?amount=${BATCH_SIZE}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Anime GIF request failed (${response.status})`);
  }

  return normalizeResults(await response.json());
}

/**
 * Returns one random { url, anime } GIF for the given action.
 * @param {string} action - nekos.best endpoint, e.g. "slap" or "kiss".
 */
export async function getAnimeGif(action) {
  const cached = pools.get(action);
  if (cached?.length) {
    return cached.splice(Math.floor(Math.random() * cached.length), 1)[0];
  }

  let request = inflight.get(action);
  if (!request) {
    request = fetchPool(action).finally(() => inflight.delete(action));
    inflight.set(action, request);
  }

  const results = await request;
  if (!results.length) {
    throw new Error(`No anime GIFs available for ${action}`);
  }

  const index = Math.floor(Math.random() * results.length);
  const [chosen] = results.splice(index, 1);
  if (results.length) {
    pools.set(action, results);
  }

  return chosen;
}

export function warmAnimeActions(actions = ['slap', 'kiss']) {
  for (const action of actions) {
    getAnimeGif(action).catch(() => {});
  }
}

warmAnimeActions();
