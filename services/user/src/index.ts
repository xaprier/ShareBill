import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDbInstance } from '@sharebill/database';
import { 
  User,
  UserSettings,
  UpdateSettingsDto,
  ApiResponse,
  DEFAULT_SETTINGS
} from '@sharebill/shared';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

const dbManager = getDbInstance(process.env.DATABASE_PATH);
const db = dbManager.getDatabase();

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'user' });
});

// Get all users (for selection in expense creation)
app.get('/users', (req: Request, res: Response) => {
  try {
    const users: any[] = db.prepare(`
      SELECT id, username, is_admin, created_at, updated_at
      FROM users
      ORDER BY username ASC
    `).all();

    const mappedUsers: User[] = users.map(row => ({
      id: row.id,
      username: row.username,
      isAdmin: row.is_admin === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    const response: ApiResponse<User[]> = {
      success: true,
      data: mappedUsers,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
});

// Get user by ID
app.get('/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const userRow: any = db.prepare(`
      SELECT id, username, is_admin, created_at, updated_at
      FROM users WHERE id = ?
    `).get(id);

    if (!userRow) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      } as ApiResponse);
    }

    const user: User = {
      id: userRow.id,
      username: userRow.username,
      isAdmin: userRow.is_admin === 1,
      createdAt: new Date(userRow.created_at),
      updatedAt: new Date(userRow.updated_at),
    };

    const response: ApiResponse<User> = {
      success: true,
      data: user,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
});

// Get user settings
app.get('/users/:id/settings', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let settingsRow: any = db.prepare(`
      SELECT user_id, language, theme, updated_at
      FROM user_settings WHERE user_id = ?
    `).get(id);

    // If settings don't exist, create default
    if (!settingsRow) {
      db.prepare(`
        INSERT INTO user_settings (user_id, language, theme)
        VALUES (?, ?, ?)
      `).run(id, DEFAULT_SETTINGS.language, DEFAULT_SETTINGS.theme);

      settingsRow = {
        user_id: id,
        ...DEFAULT_SETTINGS,
        updated_at: new Date().toISOString(),
      };
    }

    const settings: UserSettings = {
      userId: settingsRow.user_id,
      language: settingsRow.language,
      theme: settingsRow.theme,
      updatedAt: new Date(settingsRow.updated_at),
    };

    const response: ApiResponse<UserSettings> = {
      success: true,
      data: settings,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Get settings error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
});

// Update user settings
app.patch('/users/:id/settings', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates: UpdateSettingsDto = req.body;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.language) {
      fields.push('language = ?');
      values.push(updates.language);
    }
    if (updates.theme) {
      fields.push('theme = ?');
      values.push(updates.theme);
    }

    if (fields.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No fields to update' 
      } as ApiResponse);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.prepare(`
      UPDATE user_settings 
      SET ${fields.join(', ')}
      WHERE user_id = ?
    `).run(...values);

    const settingsRow: any = db.prepare(`
      SELECT user_id, language, theme, updated_at
      FROM user_settings WHERE user_id = ?
    `).get(id);

    const settings: UserSettings = {
      userId: settingsRow.user_id,
      language: settingsRow.language,
      theme: settingsRow.theme,
      updatedAt: new Date(settingsRow.updated_at),
    };

    const response: ApiResponse<UserSettings> = {
      success: true,
      data: settings,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Update settings error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
});

app.listen(PORT, () => {
  console.log(`User service running on port ${PORT}`);
});
