import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { getDbInstance } from '@sharebill/database';
import { 
  CreateUserDto, 
  LoginDto, 
  AuthResponse, 
  User,
  ApiResponse,
  generateId 
} from '@sharebill/shared';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET: string = process.env.JWT_SECRET || 'dev-secret-key';
const DISABLE_SIGNUP = (process.env.DISABLE_SIGNUP || 'false') === 'true';
const DISABLE_USER_EDIT = (process.env.DISABLE_USER_EDIT || 'false') === 'true';
const DISABLE_USER_DELETE = (process.env.DISABLE_USER_DELETE || 'false') === 'true';
const DISABLE_PASSWORD_CHANGE = (process.env.DISABLE_PASSWORD_CHANGE || 'false') === 'true';

app.use(cors());
app.use(express.json());

const dbManager = getDbInstance(process.env.DATABASE_PATH);
const db = dbManager.getDatabase();

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'auth' });
});

// Create user (Admin only)
app.post('/create-user', async (req: Request, res: Response) => {
  // Demo protection: disable creating users when flag is set
  if (DISABLE_SIGNUP) {
    return res.status(403).json({ success: false, error: 'User creation is disabled on demo server' } as ApiResponse);
  }

  try {
    const { username, password }: CreateUserDto = req.body;
    const authHeader = req.headers.authorization;

    // Check if requester is admin
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: No token provided' 
      } as ApiResponse);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      } as ApiResponse);
    }

    if (!decoded.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden: Admin access required' 
      } as ApiResponse);
    }

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      } as ApiResponse);
    }

    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?')
      .get(username);

    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        error: 'Username already exists' 
      } as ApiResponse);
    }

    const userId = generateId();
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    db.prepare(`
      INSERT INTO users (id, username, password_hash)
      VALUES (?, ?, ?)
    `).run(userId, username, passwordHash);

    // Create default settings
    db.prepare(`
      INSERT INTO user_settings (user_id, language, theme)
      VALUES (?, 'tr', 'dark')
    `).run(userId);

    const user: User = {
      id: userId,
      username,
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const response: ApiResponse<User> = {
      success: true,
      data: user,
      message: 'User created successfully',
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
});

// Update user (Admin only)
app.put('/update-user/:id', async (req: Request, res: Response) => {
  // Demo protection: disable updating users when flag is set
  if (DISABLE_USER_EDIT) {
    return res.status(403).json({ success: false, error: 'User update is disabled on demo server' } as ApiResponse);
  }

  try {
    const { id } = req.params;
    const { username, password }: { username?: string; password?: string } = req.body;
    const authHeader = req.headers.authorization;

    // Check if requester is admin
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: No token provided' 
      } as ApiResponse);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      } as ApiResponse);
    }

    if (!decoded.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden: Admin access required' 
      } as ApiResponse);
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (username) {
      // Check if username already exists for another user
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id);
      if (existing) {
        return res.status(409).json({ 
          success: false, 
          error: 'Username already exists' 
        } as ApiResponse);
      }
      updates.push('username = ?');
      values.push(username);
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No fields to update' 
      } as ApiResponse);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.prepare(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    const userRow: any = db.prepare('SELECT id, username, is_admin, created_at, updated_at FROM users WHERE id = ?').get(id);

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
      message: 'User updated successfully',
    };

    res.json(response);
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
});

// Delete user (Admin only)
app.delete('/delete-user/:id', async (req: Request, res: Response) => {
  // Demo protection: disable deleting users when flag is set
  if (DISABLE_USER_DELETE) {
    return res.status(403).json({ success: false, error: 'User deletion is disabled on demo server' } as ApiResponse);
  }

  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;

    // Check if requester is admin
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: No token provided' 
      } as ApiResponse);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      } as ApiResponse);
    }

    if (!decoded.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden: Admin access required' 
      } as ApiResponse);
    }

    // Prevent deleting admin users
    const user: any = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(id);
    if (user?.is_admin === 1) {
      return res.status(403).json({ 
        success: false, 
        error: 'Cannot delete admin user' 
      } as ApiResponse);
    }

    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      } as ApiResponse);
    }

    const response: ApiResponse = {
      success: true,
      message: 'User deleted successfully',
    };

    res.json(response);
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
});

// Login
app.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password }: LoginDto = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing username or password' 
      } as ApiResponse);
    }

    const userRow: any = db.prepare(`
      SELECT id, username, is_admin, password_hash, created_at, updated_at
      FROM users WHERE username = ?
    `).get(username);

    if (!userRow) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      } as ApiResponse);
    }

    const isValidPassword = await bcrypt.compare(password, userRow.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      } as ApiResponse);
    }

    const user: User = {
      id: userRow.id,
      username: userRow.username,
      isAdmin: userRow.is_admin === 1,
      createdAt: new Date(userRow.created_at),
      updatedAt: new Date(userRow.updated_at),
    };

    const token = jwt.sign({ 
      userId: user.id, 
      username: user.username,
      isAdmin: user.isAdmin 
    }, JWT_SECRET, { 
      expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any
    });

    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: { user, token },
    };

    res.json(response);
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
});

// Verify token and get current user
app.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      } as ApiResponse);
    }

    const token = authHeader.substring(7);
    const decoded: any = jwt.verify(token, JWT_SECRET);

    const userRow: any = db.prepare(`
      SELECT id, username, is_admin, created_at, updated_at
      FROM users WHERE id = ?
    `).get(decoded.userId);

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
    console.error('Me error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      } as ApiResponse);
    }
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
});

// Change password for authenticated user
app.post('/change-password', async (req: Request, res: Response) => {
  // Demo protection: disable password change when flag is set
  if (DISABLE_PASSWORD_CHANGE) {
    return res.status(403).json({ success: false, error: 'Password change is disabled on demo server' } as ApiResponse);
  }
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' } as ApiResponse);
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid token' } as ApiResponse);
    }

    const { currentPassword, newPassword }: { currentPassword: string; newPassword: string } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Missing current or new password' } as ApiResponse);
    }

    const userRow: any = db.prepare(`
      SELECT id, password_hash FROM users WHERE id = ?
    `).get(decoded.userId);

    if (!userRow) {
      return res.status(404).json({ success: false, error: 'User not found' } as ApiResponse);
    }

    const isValid = await bcrypt.compare(currentPassword, userRow.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' } as ApiResponse);
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(newHash, userRow.id);

    // Respond success. Client should clear local auth (auto logout) and require re-login.
    res.json({ success: true, message: 'Password changed successfully' } as ApiResponse);
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' } as ApiResponse);
  }
});

app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});
