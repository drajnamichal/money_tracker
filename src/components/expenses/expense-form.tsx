'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import type { ExpenseCategory } from '@/types/financial';

const expenseSchema = z.object({
  description: z.string().min(1, 'Popis je povinný'),
  category: z.string().min(1, 'Kategória je povinná'),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Suma musí byť kladné číslo',
  }),
  record_date: z.string().min(1, 'Dátum je povinný'),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface GroupedCategory {
  id: string;
  name: string;
  subcategories: ExpenseCategory[];
}

interface ExpenseFormProps {
  groupedCategories: GroupedCategory[];
  onSubmit: (values: ExpenseFormValues) => void;
  onCancel: () => void;
  /** Called by OCR to pre-fill form fields */
  setValueRef?: (setter: (name: keyof ExpenseFormValues, value: string) => void) => void;
}

export function ExpenseForm({
  groupedCategories,
  onSubmit,
  onCancel,
  setValueRef,
}: ExpenseFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: '',
      category: '',
      amount: '',
      record_date: new Date().toISOString().split('T')[0],
    },
  });

  // Expose setValue to parent for OCR pre-filling
  if (setValueRef) {
    setValueRef((name, value) => setValue(name, value));
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-white dark:bg-slate-900 rounded-2xl p-6 border shadow-sm overflow-hidden"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
      >
        <div className="space-y-2">
          <label htmlFor="expense-description" className="text-sm font-medium">
            Popis
          </label>
          <input
            id="expense-description"
            className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 outline-none ${errors.description ? 'border-rose-500' : ''}`}
            {...register('description')}
            placeholder="napr. Nákup potravín"
          />
          {errors.description && (
            <p className="text-xs text-rose-500">{errors.description.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="expense-category" className="text-sm font-medium">
            Kategória
          </label>
          <select
            id="expense-category"
            data-testid="expense-category-select"
            className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 outline-none ${errors.category ? 'border-rose-500' : ''}`}
            {...register('category')}
          >
            <option value="">Vybrať...</option>
            {groupedCategories.length === 0 && (
              <option value="Ostatné: nezaradené">Ostatné: nezaradené</option>
            )}
            {groupedCategories.map((group) => (
              <optgroup key={group.id} label={group.name}>
                {group.subcategories.map((sub) => (
                  <option key={sub.id} value={`${group.name}: ${sub.name}`}>
                    {sub.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {errors.category && (
            <p className="text-xs text-rose-500">{errors.category.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="expense-amount" className="text-sm font-medium">
            Čiastka (€)
          </label>
          <input
            id="expense-amount"
            type="number"
            step="0.01"
            className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 outline-none ${errors.amount ? 'border-rose-500' : ''}`}
            {...register('amount')}
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="text-xs text-rose-500">{errors.amount.message}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            data-testid="expense-submit-button"
            className="flex-1 bg-rose-600 text-white rounded-lg py-2 font-medium hover:bg-rose-700 transition-colors"
          >
            Uložiť
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Zrušiť
          </button>
        </div>
      </form>
    </motion.div>
  );
}
