const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'finding_love.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

try {
  // Add stories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      content_type TEXT DEFAULT 'image',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ stories table created');

  // Add story views table
  db.exec(`
    CREATE TABLE IF NOT EXISTS story_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      viewer_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
      FOREIGN KEY (viewer_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(story_id, viewer_id)
    )
  `);
  console.log('✓ story_views table created');

  // Add reaction column to messages if missing
  try {
    db.exec('ALTER TABLE messages ADD COLUMN reaction TEXT');
    console.log('✓ messages.reaction column added');
  } catch (e) {
    if (e.message.includes('duplicate column')) console.log('✓ messages.reaction already exists');
    else throw e;
  }

  // Add prompts column to profiles if missing
  try {
    db.exec('ALTER TABLE profiles ADD COLUMN prompts TEXT DEFAULT \'[]\'');
    console.log('✓ profiles.prompts column added');
  } catch (e) {
    if (e.message.includes('duplicate column')) console.log('✓ profiles.prompts already exists');
    else throw e;
  }

  // Add last_active column to users if missing
  try {
    db.exec('ALTER TABLE users ADD COLUMN last_active DATETIME DEFAULT CURRENT_TIMESTAMP');
    console.log('✓ users.last_active column added');
  } catch (e) {
    if (e.message.includes('duplicate column')) console.log('✓ users.last_active already exists');
    else throw e;
  }

  // Add boost_active and boost_expires to users if missing
  try {
    db.exec('ALTER TABLE users ADD COLUMN boost_active INTEGER DEFAULT 0');
    console.log('✓ users.boost_active column added');
  } catch (e) {
    if (e.message.includes('duplicate column')) console.log('✓ users.boost_active already exists');
    else throw e;
  }

  try {
    db.exec('ALTER TABLE users ADD COLUMN boost_expires DATETIME');
    console.log('✓ users.boost_expires column added');
  } catch (e) {
    if (e.message.includes('duplicate column')) console.log('✓ users.boost_expires already exists');
    else throw e;
  }

  // Add onboarding_complete to profiles
  try {
    db.exec('ALTER TABLE profiles ADD COLUMN onboarding_complete INTEGER DEFAULT 0');
    console.log('✓ profiles.onboarding_complete column added');
  } catch (e) {
    if (e.message.includes('duplicate column')) console.log('✓ profiles.onboarding_complete already exists');
    else throw e;
  }

  // Add password_resets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ password_resets table created');

  console.log('\n✓ All migrations complete!');
} catch (err) {
  console.error('Migration error:', err.message);
} finally {
  db.close();
}
