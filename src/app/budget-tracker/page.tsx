'use client';

import React, { useMemo, useCallback } from 'react';
import { useBudgetData } from '@/hooks/use-financial-data';
import { supabase } from '@/lib/supabase';
import Summary from '@/components/budget-tracker/summary';
import ExpenseForm from '@/components/budget-tracker/expense-form';
import ExpenseList from '@/components/budget-tracker/expense-list';
import ToDoList from '@/components/budget-tracker/todo-list';
import { toast } from 'sonner';

const TOTAL_BUDGET = 250000;

export default function BudgetTrackerPage() {
  const { expenses, todoItems, loading, refresh } = useBudgetData();

  const addExpense = useCallback(
    async (expense: { description: string; amount: number }) => {
      try {
        const { error } = await supabase
          .from('budget_expenses')
          .insert([expense]);

        if (error) throw error;

        toast.success('Výdavok pridaný!', {
          description: `${expense.description} (${expense.amount}€) bol úspešne pridaný.`,
        });

        // Automatically remove from to-do list by description
        const { data: matchedTodo } = await supabase
          .from('budget_todo_items')
          .select('id')
          .eq('text', expense.description);

        if (matchedTodo && matchedTodo.length > 0) {
          await supabase
            .from('budget_todo_items')
            .delete()
            .in(
              'id',
              matchedTodo.map((t) => t.id)
            );

          toast.success('Automaticky odstránené zo zoznamu!', {
            description: `${expense.description} bol odstránený zo zoznamu nákupov.`,
          });
        }

        refresh();
      } catch (e) {
        console.error('Error adding expense: ', e);
        toast.error('Chyba pri pridávaní výdavku');
      }
    },
    [refresh]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase
          .from('budget_expenses')
          .delete()
          .eq('id', id);

        if (error) throw error;

        toast.success('Výdavok odstránený!');
        refresh();
      } catch (e) {
        console.error('Error deleting expense: ', e);
        toast.error('Chyba pri odstraňovaní výdavku');
      }
    },
    [refresh]
  );

  const updateExpense = useCallback(
    async (id: string, newValues: { description: string; amount: number }) => {
      try {
        const { error } = await supabase
          .from('budget_expenses')
          .update(newValues)
          .eq('id', id);

        if (error) throw error;

        toast.success('Výdavok aktualizovaný!');
        refresh();
      } catch (e) {
        console.error('Error updating expense: ', e);
        toast.error('Chyba pri aktualizácii výdavku');
      }
    },
    [refresh]
  );

  const addToDoItem = useCallback(
    async (text: string) => {
      try {
        const { error } = await supabase
          .from('budget_todo_items')
          .insert([{ text }]);

        if (error) throw error;

        toast.success('Položka pridaná do zoznamu!');
        refresh();
      } catch (e) {
        console.error('Error adding To-Do item: ', e);
        toast.error('Chyba pri pridávaní položky');
      }
    },
    [refresh]
  );

  const deleteToDoItem = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase
          .from('budget_todo_items')
          .delete()
          .eq('id', id);

        if (error) throw error;

        toast.success('Položka odstránená!');
        refresh();
      } catch (e) {
        console.error('Error deleting To-Do item: ', e);
        toast.error('Chyba pri odstraňovaní položky');
      }
    },
    [refresh]
  );

  const { totalSpent, remainingBudget } = useMemo(() => {
    const spent = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0
    );
    return {
      totalSpent: spent,
      remainingBudget: TOTAL_BUDGET - spent,
    };
  }, [expenses]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600 dark:text-slate-400">
        <p>Pripájam sa k databáze...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black font-sans text-slate-800 dark:text-slate-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white">
            Sledovanie rozpočtu bytu
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Majte prehľad o svojich investíciách do nového bývania.
          </p>
        </header>

        <main className="space-y-8">
          <Summary
            totalBudget={TOTAL_BUDGET}
            totalSpent={totalSpent}
            remainingBudget={remainingBudget}
          />

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2">
              <ExpenseForm onAddExpense={addExpense} />
            </div>
            <div className="lg:col-span-3">
              <ExpenseList
                expenses={expenses}
                onDeleteExpense={deleteExpense}
                onUpdateExpense={updateExpense}
                totalBudget={TOTAL_BUDGET}
                totalSpent={totalSpent}
                remainingBudget={remainingBudget}
                onExportSuccess={(message) =>
                  toast.success('Export úspešný!', { description: message })
                }
                onExportError={(message) =>
                  toast.error('Chyba pri exporte', { description: message })
                }
              />
            </div>
            <div className="lg:col-span-5">
              <ToDoList
                items={todoItems}
                onAddItem={addToDoItem}
                onDeleteItem={deleteToDoItem}
              />
            </div>
          </div>
        </main>

        <footer className="text-center mt-12 text-sm text-slate-500 dark:text-slate-400">
          <p>Vytvorené s láskou pre spoločné ciele ❤️</p>
        </footer>
      </div>
    </div>
  );
}
