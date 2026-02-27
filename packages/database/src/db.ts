import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { ALL_SCHEMAS } from './schema';
import { generateId } from '@sharebill/shared';

export class DatabaseManager {
  private db: Database.Database;

  constructor(dbPath: string = './sharebill.db') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initialize();
  }

  private initialize(): void {
    ALL_SCHEMAS.forEach((schema) => {
      this.db.exec(schema);
    });

    // If no users present, create default admin/admin user
    try {
      const row: any = this.db.prepare('SELECT COUNT(*) as cnt FROM users').get();
      const count = row?.cnt ?? 0;
      if (count === 0) {
        const adminId = generateId();
        const passwordHash = bcrypt.hashSync('admin', 10);

        this.db.prepare(`
          INSERT INTO users (id, username, password_hash, is_admin)
          VALUES (?, ?, ?, 1)
        `).run(adminId, 'admin', passwordHash);

        this.db.prepare(`
          INSERT INTO user_settings (user_id, language, theme)
          VALUES (?, 'tr', 'dark')
        `).run(adminId);

        console.log('✅ Default admin user created: username=admin password=admin');
      }
    } catch (err) {
      // If users table doesn't exist or another error occurs, skip seeding
      // (table absence shouldn't happen because schemas were just executed)
    }
  }

  getDatabase(): Database.Database {
    return this.db;
  }

  close(): void {
    this.db.close();
  }

  // Transaction wrapper
  transaction<T>(callback: () => T): T {
    const trx = this.db.transaction(callback);
    return trx();
  }
}

let dbInstance: DatabaseManager | null = null;

export const getDbInstance = (dbPath?: string): DatabaseManager => {
  if (!dbInstance) {
    dbInstance = new DatabaseManager(dbPath);
  }
  return dbInstance;
};

export const closeDb = (): void => {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
};
