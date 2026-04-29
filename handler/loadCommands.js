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

function loadCommands(client) {
  const baseDir = path.join(__dirname, "..", "commands");
  if (!fs.existsSync(baseDir)) return;

  const files = walk(baseDir);
  for (const file of files) {
    const command = require(file);
    if (!command || typeof command !== "object") continue;

    if (command.name && typeof command.execute === "function") {
      client.commands.set(command.name, command);
      if (Array.isArray(command.aliases)) {
        for (const alias of command.aliases) {
          client.commands.set(alias, command);
        }
      }
    }

    if (command.data && typeof command.executeSlash === "function") {
      client.slashCommands.set(command.data.name, command);
    }
  }
}

module.exports = {
  loadCommands
};
