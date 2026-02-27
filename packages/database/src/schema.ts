export const CREATE_USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

export const CREATE_USER_SETTINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY,
    language TEXT DEFAULT 'en',
    theme TEXT DEFAULT 'light',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

export const CREATE_TRANSACTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'cancelled')),
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  );
`;

export const CREATE_TRANSACTION_RESPONSIBILITIES_TABLE = `
  CREATE TABLE IF NOT EXISTS transaction_responsibilities (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    share REAL NOT NULL,
    paid INTEGER DEFAULT 0,
    paid_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(transaction_id, user_id)
  );
`;

export const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);',
  'CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);',
  'CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);',
  'CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);',
  'CREATE INDEX IF NOT EXISTS idx_transaction_responsibilities_transaction_id ON transaction_responsibilities(transaction_id);',
  'CREATE INDEX IF NOT EXISTS idx_transaction_responsibilities_user_id ON transaction_responsibilities(user_id);',
  'CREATE INDEX IF NOT EXISTS idx_transaction_responsibilities_paid ON transaction_responsibilities(paid);',
];

export const ALL_SCHEMAS = [
  CREATE_USERS_TABLE,
  CREATE_USER_SETTINGS_TABLE,
  CREATE_TRANSACTIONS_TABLE,
  CREATE_TRANSACTION_RESPONSIBILITIES_TABLE,
  ...CREATE_INDEXES,
];
