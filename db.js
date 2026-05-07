const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'bot.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error abriendo SQLite:', err.message);
  } else {
    console.log('✅ SQLite conectado en', dbPath);
  }
});

function initDb() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'pendiente',
      reminded_2d INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;

  return run(createTableSQL);
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({
        id: this.lastID,
        changes: this.changes
      });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function addActivity({ groupId, type, title, subject, dueDate }) {
  const sql = `
    INSERT INTO activities (group_id, type, title, subject, due_date)
    VALUES (?, ?, ?, ?, ?)
  `;

  const result = await run(sql, [groupId, type, title, subject, dueDate]);
  return result.id;
}

function listPendingByGroup(groupId) {
  const sql = `
    SELECT *
    FROM activities
    WHERE group_id = ? AND status = 'pendiente'
    ORDER BY due_date ASC, id ASC
  `;

  return all(sql, [groupId]);
}

function markDone(groupId, id) {
  const sql = `
    UPDATE activities
    SET status = 'hecho'
    WHERE group_id = ? AND id = ? AND status = 'pendiente'
  `;

  return run(sql, [groupId, id]);
}

function deleteActivity(groupId, id) {
  const sql = 'DELETE FROM activities WHERE group_id = ? AND id = ?';
  return run(sql, [groupId, id]);
}

function getAllGroups() {
  const sql = 'SELECT DISTINCT group_id FROM activities';
  return all(sql);
}

function getPendingBetween(groupId, startISO, endISO) {
  const sql = `
    SELECT *
    FROM activities
    WHERE group_id = ?
      AND status = 'pendiente'
      AND due_date BETWEEN ? AND ?
    ORDER BY due_date ASC, id ASC
  `;

  return all(sql, [groupId, startISO, endISO]);
}

function getPendingDueInDays(groupId, targetISO) {
  const sql = `
    SELECT *
    FROM activities
    WHERE group_id = ?
      AND status = 'pendiente'
      AND due_date = ?
      AND reminded_2d = 0
    ORDER BY due_date ASC, id ASC
  `;

  return all(sql, [groupId, targetISO]);
}

function markReminded2d(id) {
  const sql = 'UPDATE activities SET reminded_2d = 1 WHERE id = ?';
  return run(sql, [id]);
}

module.exports = {
  initDb,
  addActivity,
  listPendingByGroup,
  markDone,
  deleteActivity,
  getAllGroups,
  getPendingBetween,
  getPendingDueInDays,
  markReminded2d
};
