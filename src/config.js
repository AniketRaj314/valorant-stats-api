function parsePositiveInteger(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseTrackedUsernames(value) {
  return (value || '')
    .split(',')
    .map((username) => username.trim())
    .filter(Boolean);
}

const TRACKED_USERNAMES = parseTrackedUsernames(process.env.TRACKED_USERNAMES);
const REFRESH_INTERVAL_HOURS = parsePositiveInteger(process.env.REFRESH_INTERVAL_HOURS || '48', 48);
const REFRESH_INTERVAL_MS = REFRESH_INTERVAL_HOURS * 60 * 60 * 1000;
const ENABLE_AUTO_REFRESH = /^(1|true|yes|on)$/i.test(process.env.ENABLE_AUTO_REFRESH || '');

function isTrackedUsername(username) {
  return TRACKED_USERNAMES.includes(username);
}

module.exports = {
  ENABLE_AUTO_REFRESH,
  TRACKED_USERNAMES,
  REFRESH_INTERVAL_HOURS,
  REFRESH_INTERVAL_MS,
  isTrackedUsername,
};
