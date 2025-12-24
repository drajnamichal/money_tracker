'use client';

import React, { useState } from 'react';
import { useBudgetData } from '@/hooks/use-financial-data';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Summary from '@/components/budget-tracker/summary';
import ExpenseForm from '@/components/budget-tracker/expense-form';
import ExpenseList from '@/components/budget-tracker/expense-list';
import TodoList from '@/components/budget-tracker/todo-list';
import { Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

const TOTAL_BUDGET = 26500;

const BudgetTrackerPage = () => {
  const { expenses, todoItems, exchangeRate, loading, refresh } =
    useBudgetData();
  const [isScanning, setIsScanning] = useState(false);

  const handleAddExpense = async (expenseData: {
    description: string;
    amount: number;
    currency: string;
    file?: File;
  }) => {
    let attachment_url = null;

    if (expenseData.file) {
      const fileExt = expenseData.file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `budget-attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('financial-attachments')
        .upload(filePath, expenseData.file);

      if (uploadError) {
        toast.error('Chyba pri nahrávaní súboru');
        console.error(uploadError);
      } else {
        const {
          data: { publicUrl },
        } = supabase.storage
          .from('financial-attachments')
          .getPublicUrl(filePath);
        attachment_url = publicUrl;
      }
    }

    const amountEur =
      expenseData.currency === 'CZK'
        ? expenseData.amount / exchangeRate
        : expenseData.amount;

    const { error } = await supabase.from('budget_expenses').insert([
      {
        description: expenseData.description,
        amount: expenseData.amount,
        amount_eur: amountEur,
        currency: expenseData.currency,
        is_fixed: false,
        attachment_url,
      },
    ]);

    if (error) {
      toast.error('Chyba pri pridávaní výdavku');
      throw error;
    }

    toast.success('Výdavok bol pridaný');
    refresh();
  };

  const handleDeleteExpense = async (id: string) => {
    const { error } = await supabase
      .from('budget_expenses')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Chyba pri mazaní výdavku');
      return;
    }

    toast.success('Výdavok bol vymazaný');
    refresh();
  };

  const handleUpdateExpense = async (
    id: string,
    updates: { description: string; amount: number; currency: string }
  ) => {
    const amountEur =
      updates.currency === 'CZK'
        ? updates.amount / exchangeRate
        : updates.amount;

    const { error } = await supabase
      .from('budget_expenses')
      .update({
        ...updates,
        amount_eur: amountEur,
      })
      .eq('id', id);

    if (error) {
      toast.error('Chyba pri úprave výdavku');
      return;
    }

    toast.success('Výdavok bol upravený');
    refresh();
  };

  const handleAddTodoItem = async (text: string) => {
    const { error } = await supabase.from('budget_todo_items').insert([
      {
        text,
      },
    ]);

    if (error) {
      toast.error('Chyba pri pridávaní položky');
      return;
    }

    toast.success('Položka pridaná');
    refresh();
  };

  const handleDeleteTodoItem = async (id: string) => {
    const { error } = await supabase
      .from('budget_todo_items')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Chyba pri mazaní položky');
      return;
    }

    toast.success('Položka vymazaná');
    refresh();
  };

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount_eur), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none">
          <Building2 className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Rozpočet bytu
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Prehľad nákladov a nákupný zoznam pre naše nové bývanie
          </p>
          {!loading && exchangeRate && (
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">
              Aktuálny kurz: 1 EUR = {exchangeRate.toFixed(2)} CZK
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Summary
              totalBudget={TOTAL_BUDGET}
              totalSpent={totalSpent}
              remaining={TOTAL_BUDGET - totalSpent}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ExpenseList
              expenses={expenses}
              onDeleteExpense={handleDeleteExpense}
              onUpdateExpense={handleUpdateExpense}
              loading={loading}
            />
          </motion.div>
        </div>

        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ExpenseForm onAddExpense={handleAddExpense} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <TodoList
              items={todoItems}
              onAddItem={handleAddTodoItem}
              onDeleteItem={handleDeleteTodoItem}
              loading={loading}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default BudgetTrackerPage;
