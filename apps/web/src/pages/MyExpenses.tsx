import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { transactionApi } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { format } from 'date-fns';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export const MyExpenses: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadExpenses();
  }, [page]);

  const loadExpenses = async () => {
    try {
      const response = await transactionApi.getMyCreated({ page, pageSize: 10 });
      if (response.data.success && response.data.data) {
        setExpenses(response.data.data.items);
        setTotalPages(response.data.data.totalPages);
      }
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpense = (expenseId: string) => {
    setExpandedExpense(expandedExpense === expenseId ? null : expenseId);
  };

  const formatAmount = (amount: number) => {
    return amount.toFixed(2);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">{t('loading')}...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('myExpenses')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('expensesYouCreated')}
          </p>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">{t('noExpensesYet')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {expenses.map((expense) => {
              const isFullyPaid = expense.paidCount === expense.totalCount;
              return (
                <div
                  key={expense.transaction.id}
                  className={`rounded-lg shadow-sm border transition-colors ${isFullyPaid
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                >
                  {/* Expense Header */}
                  <div
                    className={`p-4 cursor-pointer transition-colors ${isFullyPaid
                        ? 'hover:bg-green-100 dark:hover:bg-green-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    onClick={() => toggleExpense(expense.transaction.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {expense.transaction.title}
                        </h3>
                        {expense.transaction.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {expense.transaction.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          {format(new Date(expense.transaction.createdAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            ₺{formatAmount(expense.transaction.amount)}
                          </p>
                          <p className={`text-sm font-medium ${isFullyPaid
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-600 dark:text-gray-400'
                            }`}>
                            {expense.paidCount}/{expense.totalCount} {t('paid')}
                          </p>
                        </div>
                        {expandedExpense === expense.transaction.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expense Details (expandable) */}
                  {expandedExpense === expense.transaction.id && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                      <h4 className="font-semibold mb-3">{t('paymentStatus')}</h4>
                      <div className="space-y-2">
                        {expense.responsibilities.map((resp: any) => (
                          <div
                            key={resp.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                          >
                            <div className="flex items-center gap-3">
                              {resp.paid ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )}
                              <div>
                                <p className="font-medium">
                                  {resp.username}
                                  {resp.userId === user?.id && (
                                    <span className="text-xs text-gray-500 ml-1">({t('youLabel')})</span>
                                  )}
                                </p>
                                {resp.paid && resp.paidAt && (
                                  <p className="text-xs text-gray-500">
                                    {format(new Date(resp.paidAt), 'dd/MM/yyyy HH:mm')}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">
                                ₺{formatAmount(resp.share)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {resp.paid ? t('paid') : t('pending')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                >
                  {t('previous')}
                </button>
                <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                >
                  {t('next')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};
