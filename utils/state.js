let runtime = {
  stockTimer: null,
  readyAt: null,
  pendingActSessions: new Map()
};

function setRuntime(nextRuntime) {
  runtime = nextRuntime;
}

function getRuntime() {
  return runtime;
}

module.exports = {
  setRuntime,
  getRuntime
};
