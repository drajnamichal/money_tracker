import React, { useState } from 'react';
import { MoneyEmoji, PlusEmoji } from './icons';

interface ExpenseFormProps {
  onAddExpense: (expense: { description: string; amount: number }) => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onAddExpense }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);

    if (!description.trim() || !amount) {
      setError('Vyplňte, prosím, popis aj sumu.');
      return;
    }
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Suma musí byť platné kladné číslo.');
      return;
    }

    onAddExpense({ description, amount: numericAmount });
    setDescription('');
    setAmount('');
    setError('');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
        <PlusEmoji className="w-5 h-5" />
        Pridať novú položku
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Popis
          </label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Napr. Kuchynská linka"
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-sm shadow-sm placeholder-slate-400
              focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:text-slate-200"
          />
        </div>
        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1"
          >
            <MoneyEmoji className="w-4 h-4" />
            Suma (€)
          </label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-slate-500 text-sm">€</span>
            </div>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="block w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-sm shadow-sm placeholder-slate-400
                focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:text-slate-200"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          Pridať výdavok
        </button>
      </form>
    </div>
  );
};

export default ExpenseForm;
