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

function log(label, message) {
  console.log(`${ts()} [${label}] ${message}`);
}

module.exports = { log };
