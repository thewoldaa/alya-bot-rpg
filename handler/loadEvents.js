const fs = require("fs");
const path = require("path");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

function loadEvents(client) {
  const baseDir = path.join(__dirname, "..", "events");
  if (!fs.existsSync(baseDir)) return;

  const files = walk(baseDir);
  for (const file of files) {
    const event = require(file);
    if (!event || typeof event.execute !== "function") continue;

    if (event.once) {
      client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
      client.on(event.name, (...args) => event.execute(client, ...args));
    }
  }
}

module.exports = {
  loadEvents
};
