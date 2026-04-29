const { jobs } = require("../config");
const { money } = require("./format");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function findJob(query) {
  const input = String(query || "").trim();
  if (!input) return null;

  const normalized = normalize(input);
  return jobs.find((job) =>
    normalize(job.key) === normalized ||
    normalize(job.name) === normalized ||
    normalize(job.name).includes(normalized) ||
    normalized.includes(normalize(job.key))
  ) || null;
}

function formatJobs() {
  return jobs.map((job) => (
    `- **${job.key}** (${job.name})\n  Gaji: ${money(job.salaryMin)} - ${money(job.salaryMax)} | XP: ${job.xpMin}-${job.xpMax} | Lapar: ${job.hungerCost}\n  ${job.desc}`
  )).join("\n");
}

module.exports = {
  findJob,
  formatJobs
};
