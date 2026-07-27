const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = path.join(__dirname, '..', 'finding_love.db');
const sqlite = new Database(dbPath);

sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Wrapper to mimic pg pool.query() interface
const pool = {
  query(sql, params = []) {
    // Convert $1, $2, ... positional params to ? placeholders
    let i = 0;
    const converted = sql.replace(/\$\d+/g, () => params[i++] || null);

    const isSelect = /^\s*SELECT/i.test(sql);
    const isInsertReturning = /RETURNING/i.test(sql);

    try {
      if (isSelect || isInsertReturning) {
        const stmt = sqlite.prepare(converted);
        const rows = stmt.all(...params);
        return { rows };
      } else {
        const stmt = sqlite.prepare(converted);
        const result = stmt.run(...params);
        return { rows: [{ id: result.lastInsertRowid, changes: result.changes }] };
      }
    } catch (err) {
      console.error('DB Error:', err.message, '\nSQL:', sql);
      throw err;
    }
  },

  async connect() {
    return {
      async query(sql, params = []) {
        let i = 0;
        const converted = sql.replace(/\$\d+/g, () => params[i++] || null);
        const isSelect = /^\s*SELECT/i.test(sql);
        const isInsertReturning = /RETURNING/i.test(sql);

        if (isSelect || isInsertReturning) {
          const stmt = sqlite.prepare(converted);
          const rows = stmt.all(...params);
          return { rows };
        } else {
          const stmt = sqlite.prepare(converted);
          const result = stmt.run(...params);
          return { rows: [{ id: result.lastInsertRowid, changes: result.changes }] };
        }
      },
      async beginTransaction() { sqlite.exec('BEGIN'); },
      async commit() { sqlite.exec('COMMIT'); },
      async rollback() { sqlite.exec('ROLLBACK'); },
      release() {},
    };
  },
};

module.exports = pool;
module.exports.sqlite = sqlite;
