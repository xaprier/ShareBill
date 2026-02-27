import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { transactionApi } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { format } from 'date-fns';
import { CheckCircle } from 'lucide-react';

export const MyDebts: React.FC = () => {
  const { t } = useTranslation();
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDebts();
  }, []);

  const loadDebts = async () => {
    try {
      const response = await transactionApi.getMyDebts();
      if (response.data.success && response.data.data) {
        setDebts(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load debts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (transactionId: string) => {
    try {
      await transactionApi.markAsPaid(transactionId);
      loadDebts();
    } catch (error) {
      console.error('Failed to mark as paid:', error);
    }
  };

  const formatAmount = (amount: number) => {
    return amount.toFixed(2);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('myDebts')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('yourPendingPayments')}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">{t('loading')}</div>
        ) : debts.length === 0 ? (
          <div className="card text-center py-12">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {t('noPendingDebts')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {debts.map((debt) => (
              <div key={debt.responsibility.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{debt.transaction.title}</h3>
                    {debt.transaction.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        {debt.transaction.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {format(new Date(debt.transaction.createdAt), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {formatAmount(debt.responsibility.share)}
                    </p>
                    <p className="text-xs text-gray-500">{t('myShare')}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleMarkAsPaid(debt.transaction.id)}
                  className="btn btn-primary w-full"
                >
                  {t('markAsPaid')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
