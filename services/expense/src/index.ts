import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDbInstance } from '@sharebill/database';
import { 
  Transaction,
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionResponsibility,
  MarkAsPaidDto,
  TransactionQueryParams,
  UserStatistics,
  ApiResponse,
  PaginatedResponse,
  TransactionStatus,
  generateId,
  calculateShare,
  PAGINATION
} from '@sharebill/shared';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

const dbManager = getDbInstance(process.env.DATABASE_PATH);
const db = dbManager.getDatabase();

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'expense' });
});

// Create transaction
app.post('/transactions', (req: Request, res: Response) => {
  try {
    const { title, description, amount, responsibleUsers }: CreateTransactionDto = req.body;
    const createdBy = req.headers['x-user-id'] as string;

    if (!title || !amount || !responsibleUsers || responsibleUsers.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      } as ApiResponse);
    }

    const transactionId = generateId();
    const share = calculateShare(amount, responsibleUsers.length);

    // Use transaction for atomicity
    dbManager.transaction(() => {
      // Insert transaction
      db.prepare(`
        INSERT INTO transactions (id, title, description, amount, created_by)
        VALUES (?, ?, ?, ?, ?)
      `).run(transactionId, title, description || null, amount, createdBy);

      // Insert responsibilities
      // Creator is automatically marked as paid
      const insertRespPaid = db.prepare(`
        INSERT INTO transaction_responsibilities (id, transaction_id, user_id, share, paid, paid_at)
        VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `);

      const insertRespUnpaid = db.prepare(`
        INSERT INTO transaction_responsibilities (id, transaction_id, user_id, share, paid)
        VALUES (?, ?, ?, ?, 0)
      `);

      responsibleUsers.forEach(userId => {
        const isPayer = userId === createdBy;
        if (isPayer) {
          insertRespPaid.run(generateId(), transactionId, userId, share);
        } else {
          insertRespUnpaid.run(generateId(), transactionId, userId, share);
        }
      });
    });

    const transaction: Transaction = {
      id: transactionId,
      title,
      description,
      amount,
      status: TransactionStatus.PENDING,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const response: ApiResponse<Transaction> = {
      success: true,
      data: transaction,
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Create transaction error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
});

// Get transactions with filters
app.get('/transactions', (req: Request, res: Response) => {
  try {
    const {
      status,
      userId,
      startDate,
      endDate,
      page = PAGINATION.DEFAULT_PAGE,
      pageSize = PAGINATION.DEFAULT_PAGE_SIZE
    }: TransactionQueryParams = req.query as any;

    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (userId) {
      query += ` AND id IN (
        SELECT transaction_id FROM transaction_responsibilities WHERE user_id = ?
      )`;
      params.push(userId);
    }
    if (startDate) {
      query += ' AND created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND created_at <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY created_at DESC';

    const totalQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const total = (db.prepare(totalQuery).get(...params) as any)?.count || 0;

    const offset = (Number(page) - 1) * Number(pageSize);
    query += ` LIMIT ? OFFSET ?`;
    params.push(Number(pageSize), offset);

    const rows: any[] = db.prepare(query).all(...params);

    const transactions: Transaction[] = rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      amount: row.amount,
      status: row.status,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    const response: ApiResponse<PaginatedResponse<Transaction>> = {
      success: true,
      data: {
        items: transactions,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    };

    res.json(response);
  } catch (error: any) {
    console.error('Get transactions error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
});

// Get my debts (unpaid responsibilities)
app.get('/transactions/my-debts', (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    const rows: any[] = db.prepare(`
      SELECT 
        t.*,
        tr.id as resp_id,
        tr.share,
        tr.paid,
        tr.paid_at
      FROM transactions t
      JOIN transaction_responsibilities tr ON t.id = tr.transaction_id
      WHERE tr.user_id = ? AND t.created_by != ? AND tr.paid = 0 AND t.status = 'pending'
      ORDER BY t.created_at DESC
    `).all(userId, userId);

    const debts = rows.map(row => ({
      transaction: {
        id: row.id,
        title: row.title,
        description: row.description,
        amount: row.amount,
        status: row.status,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
      responsibility: {
        id: row.resp_id,
        transactionId: row.id,
        userId,
        share: row.share,
        paid: Boolean(row.paid),
        paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
    }));

    const response: ApiResponse = {
      success: true,
      data: debts,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Get debts error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
});

// Get my history (all responsibilities including paid)
app.get('/transactions/my-history', (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { page = 1, pageSize = 20 } = req.query;

    const total = (db.prepare(`
      SELECT COUNT(*) as count
      FROM transaction_responsibilities tr
      JOIN transactions t ON tr.transaction_id = t.id
      WHERE tr.user_id = ? AND t.created_by != ?
    `).get(userId, userId) as any)?.count || 0;

    const offset = (Number(page) - 1) * Number(pageSize);

    const rows: any[] = db.prepare(`
      SELECT 
        t.*,
        tr.id as resp_id,
        tr.share,
        tr.paid,
        tr.paid_at
      FROM transactions t
      JOIN transaction_responsibilities tr ON t.id = tr.transaction_id
      WHERE tr.user_id = ? AND t.created_by != ?
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, userId, Number(pageSize), offset);

    const history = rows.map(row => ({
      transaction: {
        id: row.id,
        title: row.title,
        description: row.description,
        amount: row.amount,
        status: row.status,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
      responsibility: {
        id: row.resp_id,
        transactionId: row.id,
        userId,
        share: row.share,
        paid: Boolean(row.paid),
        paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
    }));

    const response: ApiResponse<PaginatedResponse<any>> = {
      success: true,
      data: {
        items: history,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    };

    res.json(response);
  } catch (error: any) {
    console.error('Get history error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
});

// Get my created expenses (expenses created by me with payment status of each user)
app.get('/transactions/my-created', (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { page = 1, pageSize = 20 } = req.query;

    const total = (db.prepare(`
      SELECT COUNT(*) as count
      FROM transactions
      WHERE created_by = ?
    `).get(userId) as any)?.count || 0;

    const offset = (Number(page) - 1) * Number(pageSize);

    const transactions: any[] = db.prepare(`
      SELECT *
      FROM transactions
      WHERE created_by = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, Number(pageSize), offset);

    const expensesWithResponsibilities = transactions.map(transaction => {
      const responsibilities: any[] = db.prepare(`
        SELECT 
          tr.*,
          u.username
        FROM transaction_responsibilities tr
        JOIN users u ON tr.user_id = u.id
        WHERE tr.transaction_id = ?
      `).all(transaction.id);

      const paidCount = responsibilities.filter(r => r.paid === 1).length;
      const totalCount = responsibilities.length;

      return {
        transaction: {
          id: transaction.id,
          title: transaction.title,
          description: transaction.description,
          amount: transaction.amount,
          status: transaction.status,
          createdBy: transaction.created_by,
          createdAt: new Date(transaction.created_at),
          updatedAt: new Date(transaction.updated_at),
        },
        responsibilities: responsibilities.map(r => ({
          id: r.id,
          transactionId: r.transaction_id,
          userId: r.user_id,
          username: r.username,
          share: r.share,
          paid: Boolean(r.paid),
          paidAt: r.paid_at ? new Date(r.paid_at) : undefined,
          createdAt: new Date(r.created_at),
          updatedAt: new Date(r.updated_at),
        })),
        paidCount,
        totalCount,
      };
    });

    const response: ApiResponse<PaginatedResponse<any>> = {
      success: true,
      data: {
        items: expensesWithResponsibilities,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    };

    res.json(response);
  } catch (error: any) {
    console.error('Get created expenses error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
});

// Get debts summary grouped by creditor (who I owe money to)
app.get('/transactions/debts-summary', (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    const summary: any[] = db.prepare(`
      SELECT 
        t.created_by as creditor_id,
        u.username as creditor_username,
        COUNT(DISTINCT t.id) as transaction_count,
        SUM(tr.share) as total_amount
      FROM transaction_responsibilities tr
      JOIN transactions t ON tr.transaction_id = t.id
      JOIN users u ON t.created_by = u.id
      WHERE tr.user_id = ? AND t.created_by != ? AND tr.paid = 0
      GROUP BY t.created_by, u.username
      ORDER BY total_amount DESC
    `).all(userId, userId);

    const response: ApiResponse = {
      success: true,
      data: summary,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Get debts summary error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
});

// Get receivables summary grouped by debtor (who owes me money)
app.get('/transactions/receivables-summary', (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    const summary: any[] = db.prepare(`
      SELECT 
        tr.user_id as debtor_id,
        u.username as debtor_username,
        COUNT(DISTINCT t.id) as transaction_count,
        SUM(tr.share) as total_amount
      FROM transactions t
      JOIN transaction_responsibilities tr ON t.id = tr.transaction_id
      JOIN users u ON tr.user_id = u.id
      WHERE t.created_by = ? AND tr.user_id != ? AND tr.paid = 0
      GROUP BY tr.user_id, u.username
      ORDER BY total_amount DESC
    `).all(userId, userId);

    const response: ApiResponse = {
      success: true,
      data: summary,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Get receivables summary error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
});

// Mark as paid
app.post('/transactions/:id/mark-paid', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string;

    const result = db.prepare(`
      UPDATE transaction_responsibilities
      SET paid = 1, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE transaction_id = ? AND user_id = ?
    `).run(id, userId);

    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Responsibility not found' 
      } as ApiResponse);
    }

    // Check if all responsibilities are paid
    const unpaidCount = (db.prepare(`
      SELECT COUNT(*) as count
      FROM transaction_responsibilities
      WHERE transaction_id = ? AND paid = 0
    `).get(id) as any)?.count || 0;

    // If all paid, update transaction status
    if (unpaidCount === 0) {
      db.prepare(`
        UPDATE transactions
        SET status = 'paid', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Marked as paid successfully',
    };

    res.json(response);
  } catch (error: any) {
    console.error('Mark paid error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
});

// Get transaction by ID with responsibilities
app.get('/transactions/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const transactionRow: any = db.prepare(`
      SELECT * FROM transactions WHERE id = ?
    `).get(id);

    if (!transactionRow) {
      return res.status(404).json({ 
        success: false, 
        error: 'Transaction not found' 
      } as ApiResponse);
    }

    const responsibilities: any[] = db.prepare(`
      SELECT 
        tr.*,
        u.username as user_name
      FROM transaction_responsibilities tr
      JOIN users u ON tr.user_id = u.id
      WHERE tr.transaction_id = ?
    `).all(id);

    const transaction = {
      ...transactionRow,
      responsibilities: responsibilities.map(r => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        share: r.share,
        paid: Boolean(r.paid),
        paidAt: r.paid_at ? new Date(r.paid_at) : null,
      })),
    };

    const response: ApiResponse = {
      success: true,
      data: transaction,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Get transaction error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
});

// Get user statistics
app.get('/statistics/user/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const stats: any = db.prepare(`
      SELECT 
        SUM(tr.share) as total_expenses,
        SUM(CASE WHEN tr.paid = 0 THEN tr.share ELSE 0 END) as pending_debts,
        SUM(CASE WHEN tr.paid = 1 THEN tr.share ELSE 0 END) as paid_debts
      FROM transaction_responsibilities tr
      JOIN transactions t ON tr.transaction_id = t.id
      WHERE tr.user_id = ? AND t.created_by != ?
    `).get(userId, userId);

    const statistics: UserStatistics = {
      totalExpenses: stats?.total_expenses || 0,
      pendingDebts: stats?.pending_debts || 0,
      paidDebts: stats?.paid_debts || 0,
    };

    const response: ApiResponse<UserStatistics> = {
      success: true,
      data: statistics,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Get statistics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    } as ApiResponse);
  }
});

app.listen(PORT, () => {
  console.log(`Expense service running on port ${PORT}`);
});
