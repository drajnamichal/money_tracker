import React, { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { BudgetExpense } from '@/types/financial';
import {
  TrashIcon,
  LockIcon,
  EditIcon,
  CheckIcon,
  XIcon,
  CategoryEmoji,
  MoneyEmoji,
  ImageIcon,
} from './icons';

interface ExpenseListProps {
  expenses: BudgetExpense[];
  onDeleteExpense: (id: string) => void;
  onUpdateExpense: (
    id: string,
    newValues: { description: string; amount: number; currency: string }
  ) => void;
  loading?: boolean;
}

const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  onDeleteExpense,
  onUpdateExpense,
  loading,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedDescription, setEditedDescription] = useState('');
  const [editedAmount, setEditedAmount] = useState('');
  const [editedCurrency, setEditedCurrency] = useState('EUR');

  const handleEditStart = (expense: BudgetExpense) => {
    setEditingId(expense.id);
    setEditedDescription(expense.description);
    setEditedAmount(expense.amount.toString());
    setEditedCurrency(expense.currency || 'EUR');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedDescription('');
    setEditedAmount('');
    setEditedCurrency('EUR');
  };

  const handleSaveEdit = (id: string) => {
    const numericAmount = parseFloat(editedAmount);
    if (
      editedDescription.trim() &&
      !isNaN(numericAmount) &&
      numericAmount > 0
    ) {
      onUpdateExpense(id, {
        description: editedDescription.trim(),
        amount: numericAmount,
        currency: editedCurrency,
      });
      handleCancelEdit();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
        <CategoryEmoji className="w-5 h-5" />
        Zoznam výdavkov
      </h2>
      <div className="space-y-3 max-h-[400px] lg:max-h-[500px] overflow-y-auto pr-2">
        {loading ? (
          <p className="text-slate-500 dark:text-slate-400 text-center py-8 italic">
            Načítavam...
          </p>
        ) : expenses.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-center py-8">
            Zatiaľ žiadne výdavky. Pridajte prvú položku!
          </p>
        ) : (
          expenses.map((expense) => (
            <div
              key={expense.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                expense.is_fixed
                  ? 'bg-slate-100 dark:bg-slate-800/50'
                  : 'bg-slate-50 dark:bg-slate-800'
              }`}
            >
              {editingId === expense.id ? (
                <>
                  <div className="flex-grow space-y-2">
                    <input
                      type="text"
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="block w-full px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-slate-200"
                      aria-label="Upraviť popis"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={editedAmount}
                        onChange={(e) => setEditedAmount(e.target.value)}
                        className="block flex-1 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-slate-200"
                        aria-label="Upraviť sumu"
                      />
                      <select
                        value={editedCurrency}
                        onChange={(e) => setEditedCurrency(e.target.value)}
                        className="block w-20 px-1 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-slate-200"
                      >
                        <option value="EUR">EUR</option>
                        <option value="CZK">CZK</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center ml-2">
                    <button
                      onClick={() => handleSaveEdit(expense.id)}
                      className="p-2 rounded-full text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                      aria-label="Uložiť zmeny"
                    >
                      <CheckIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                      aria-label="Zrušiť úpravy"
                    >
                      <XIcon className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {expense.description}
                      </p>
                      {expense.attachment_url && (
                        <a
                          href={expense.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-500 hover:text-indigo-600 transition-colors p-1"
                          title="Zobraziť prílohu"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col text-[10px] sm:text-xs">
                      <p className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <MoneyEmoji className="w-3 h-3" />
                        {expense.currency === 'CZK'
                          ? `${expense.amount} CZK (${formatCurrency(expense.amount_eur)})`
                          : formatCurrency(expense.amount)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center ml-4 shrink-0">
                    {expense.is_fixed ? (
                      <span
                        className="p-2 text-slate-400 dark:text-slate-500"
                        title="Táto položka je fixná a nedá sa vymazať."
                      >
                        <LockIcon className="w-5 h-5" />
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditStart(expense)}
                          className="p-2 rounded-full text-slate-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          aria-label="Upraviť položku"
                        >
                          <EditIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => onDeleteExpense(expense.id)}
                          className="p-2 rounded-full text-slate-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                          aria-label="Vymazať položku"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExpenseList;
