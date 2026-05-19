const TRACKED_USERNAMES = ['Spider31415#6921'];

function isTrackedUsername(username) {
  return TRACKED_USERNAMES.includes(username);
}

module.exports = { TRACKED_USERNAMES, isTrackedUsername };
