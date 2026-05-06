const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const MAX_AGE_DAYS = 30;

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function cleanOldLogs() {
  const now = Date.now();
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(LOG_DIR);
  for (const f of files) {
    const fp = path.join(LOG_DIR, f);
    const stat = fs.statSync(fp);
    if (now - stat.mtimeMs > maxAge) {
      fs.unlinkSync(fp);
    }
  }
}

function logFile() {
  const d = new Date();
  const ds = d.toISOString().slice(0, 10);
  return path.join(LOG_DIR, `app-${ds}.log`);
}

function write(level, module, message) {
  ensureLogDir();
  const ts = new Date().toISOString();
  const line = `[${level}] [${ts}] [${module}] ${message}\n`;
  fs.appendFileSync(logFile(), line, 'utf8');
}

const logger = {
  info(module, msg) { write('INFO', module, msg); },
  warn(module, msg) { write('WARN', module, msg); },
  error(module, msg) { write('ERROR', module, msg); },
  fatal(module, msg) { write('FATAL', module, msg); },
  clean: cleanOldLogs,
};

module.exports = { logger };
