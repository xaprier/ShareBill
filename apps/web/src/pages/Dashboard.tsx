import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { transactionApi } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { AlertCircle, ChevronDown, ChevronUp, Users } from 'lucide-react';

interface DebtSummary {
  creditor_id: string;
  creditor_username: string;
  transaction_count: number;
  total_amount: number;
}

interface ReceivableSummary {
  debtor_id: string;
  debtor_username: string;
  transaction_count: number;
  total_amount: number;
}

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [debtsSummary, setDebtsSummary] = useState<DebtSummary[]>([]);
  const [receivablesSummary, setReceivablesSummary] = useState<ReceivableSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDebt, setExpandedDebt] = useState<string | null>(null);
  const [expandedReceivable, setExpandedReceivable] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [debtsRes, receivablesRes] = await Promise.all([
        transactionApi.getDebtsSummary(),
        transactionApi.getReceivablesSummary(),
      ]);

      if (debtsRes.data.success && debtsRes.data.data) {
        setDebtsSummary(debtsRes.data.data);
      }
      if (receivablesRes.data.success && receivablesRes.data.data) {
        setReceivablesSummary(receivablesRes.data.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return amount.toFixed(2);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('welcomeBackUser', { username: user?.username })}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">{t('loading')}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Who Owes You - Receivables */}
            <div className="card flex flex-col">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t('whoOwesYou')}
              </h3>
              {receivablesSummary.length > 0 ? (
                <div className="flex-1">
                  <div className="space-y-2">
                    {receivablesSummary.map((item) => (
                      <div key={item.debtor_id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div
                          className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          onClick={() => setExpandedReceivable(
                            expandedReceivable === item.debtor_id ? null : item.debtor_id
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{item.debtor_username}</p>
                              <p className="text-xs text-gray-500">
                                {item.transaction_count} {t('expenses')}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                ₺{formatAmount(item.total_amount)}
                              </p>
                              {expandedReceivable === item.debtor_id ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>
                        {expandedReceivable === item.debtor_id && (
                          <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-700/30">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {t('viewDetailsIn')} <Link to="/expenses" className="text-blue-600 dark:text-blue-400 hover:underline">{t('myExpenses')}</Link>
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">{t('noOneOwesYou')}</p>
                </div>
              )}
            </div>

            {/* Pending Debts */}
            <div className="card flex flex-col">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {t('pendingDebts')}
              </h3>
              {debtsSummary.length > 0 ? (
                <div className="flex-1">
                  <div className="space-y-2">
                    {debtsSummary.map((item) => (
                      <div key={item.creditor_id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div
                          className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          onClick={() => setExpandedDebt(
                            expandedDebt === item.creditor_id ? null : item.creditor_id
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{item.creditor_username}</p>
                              <p className="text-xs text-gray-500">
                                {item.transaction_count} {t('expenses')}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                ₺{formatAmount(item.total_amount)}
                              </p>
                              {expandedDebt === item.creditor_id ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>
                        {expandedDebt === item.creditor_id && (
                          <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-700/30">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {t('viewDetailsIn')} <Link to="/debts" className="text-blue-600 dark:text-blue-400 hover:underline">{t('myDebts')}</Link>
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">{t('noPendingDebts')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
