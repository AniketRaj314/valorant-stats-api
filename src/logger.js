function ts() {
  const now = new Date();
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const dd = pad(now.getDate());
  const mm = pad(now.getMonth() + 1);
  const yy = String(now.getFullYear()).slice(-2);
  const HH = pad(now.getHours());
  const MM = pad(now.getMinutes());
  const SS = pad(now.getSeconds());
  return `[${dd}/${mm}/${yy} ${HH}:${MM}:${SS}]`;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

const LABEL_EMOJIS = {
  APIFY: '🕷️',
  AUTOREFRESH: '⏰',
  CONFIG: '⚙️',
  DECISION: '🤔',
  ENRICH: '✨',
  ERROR: '❌',
  INIT: '🚀',
  NOT_FOUND: '🚫',
  REFRESH: '🔄',
  REQUEST: '📥',
  RESPONSE: '📤',
  SCRAPE: '🔍',
  SNAPSHOT: '💾',
  SCHEDULE: '📅',
  STATIC: '🧱',
  WARN: '⚠️',
};

function log(label, message) {
  const emoji = LABEL_EMOJIS[label] || '🔹';
  console.log(`${ts()} ${emoji} [${label}] ${message}`);
}

module.exports = { formatDuration, log };
