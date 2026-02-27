import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { transactionApi } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Clock, TrendingDown, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

type TabType = 'outcome' | 'income';
type FilterType = 'all' | 'pending' | 'paid';

export const History: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('outcome');
  const [filter, setFilter] = useState<FilterType>('all');
  const [outcomeHistory, setOutcomeHistory] = useState<any[]>([]);
  const [incomeHistory, setIncomeHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [activeTab, filter]);

  useEffect(() => {
    loadHistory();
  }, [page, activeTab, filter]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      if (activeTab === 'outcome') {
        const response = await transactionApi.getMyHistory({ page, pageSize: 20 });
        if (response.data.success && response.data.data) {
          setOutcomeHistory(response.data.data.items);
          setTotalPages(response.data.data.totalPages);
        }
      } else {
        const response = await transactionApi.getMyCreated({ page, pageSize: 20 });
        if (response.data.success && response.data.data) {
          // Flatten responsibilities into individual items
          const items: any[] = [];
          response.data.data.items.forEach((expense: any) => {
            expense.responsibilities.forEach((resp: any) => {
              // Skip the creator's own responsibility
              if (resp.userId !== user?.id) {
                items.push({
                  transaction: expense.transaction,
                  responsibility: resp,
                });
              }
            });
          });
          setIncomeHistory(items);
          setTotalPages(response.data.data.totalPages);
        }
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return amount.toFixed(2);
  };

  const getStatusIcon = (paid: boolean, status: string) => {
    if (paid) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (status === 'cancelled') return <XCircle className="w-5 h-5 text-gray-500" />;
    return <Clock className="w-5 h-5 text-orange-500" />;
  };

  const currentHistory = activeTab === 'outcome' ? outcomeHistory : incomeHistory;
  const filteredHistory = currentHistory.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'pending') return !item.responsibility.paid;
    if (filter === 'paid') return item.responsibility.paid;
    return true;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('history')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('transactionHistory')}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('outcome')}
            className={`pb-3 px-4 font-medium transition-colors flex items-center gap-2 ${activeTab === 'outcome'
                ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
          >
            <TrendingDown className="w-4 h-4" />
            {t('outcome')}
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`pb-3 px-4 font-medium transition-colors flex items-center gap-2 ${activeTab === 'income'
                ? 'border-b-2 border-green-500 text-green-600 dark:text-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
          >
            <TrendingUp className="w-4 h-4" />
            {t('receivables')}
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            {t('filterAll')}
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg transition-colors ${filter === 'pending'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            {t('filterPending')}
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-4 py-2 rounded-lg transition-colors ${filter === 'paid'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            {t('filterPaid')}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">{t('loading')}</div>
        ) : (
          <>
            <div className="space-y-3">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-12 card">
                  <p className="text-gray-500 dark:text-gray-400">{t('noTransactions')}</p>
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <div key={item.responsibility.id} className="card">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getStatusIcon(item.responsibility.paid, item.transaction.status)}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{item.transaction.title}</h3>
                          {item.transaction.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {item.transaction.description}
                            </p>
                          )}
                          {activeTab === 'income' && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {item.responsibility.username}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(item.transaction.createdAt), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        <p className={`text-lg font-bold ${activeTab === 'income'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-orange-600 dark:text-orange-400'
                          }`}>
                          {activeTab === 'income' ? '+' : '-'}₺{formatAmount(item.responsibility.share)}
                        </p>
                        <div className="flex items-center justify-end space-x-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${item.responsibility.paid
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                            }`}>
                            {item.responsibility.paid ? t('paid') : t('pending')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  {t('previous')}
                </button>
                <span className="px-4 py-2">
                  {t('page')} {page} {t('of')} {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  {t('next')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};
