const currency = new Intl.NumberFormat("id-ID");

function money(value) {
  return `Rp${currency.format(Number(value || 0))}`;
}

function number(value) {
  return currency.format(Number(value || 0));
}

function timeAgo(timestamp) {
  if (!timestamp) return "-";
  const diff = Date.now() - Number(timestamp);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds} detik lalu`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

function formatDate(timestamp) {
  if (!timestamp) return "-";
  return new Date(Number(timestamp)).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

module.exports = {
  money,
  number,
  timeAgo,
  formatDate
};
