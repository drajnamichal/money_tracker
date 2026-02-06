'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { ExpenseCategory } from '@/types/financial';

interface CategoryManagerProps {
  categories: ExpenseCategory[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

export function CategoryManager({
  categories,
  onClose,
  onRefresh,
}: CategoryManagerProps) {
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const { error } = await supabase
        .from('expense_categories')
        .insert([{ name: newCategoryName.trim() }]);

      if (error) {
        if (error.code === '23505') {
          toast.error('Táto kategória už existuje');
        } else {
          throw error;
        }
        return;
      }

      setNewCategoryName('');
      await onRefresh();
      toast.success('Kategória pridaná');
    } catch (err: unknown) {
      console.error('Error adding category:', err);
      toast.error('Chyba pri pridávaní kategórie');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    const deletedCategory = categories.find((c) => c.id === id);
    if (!deletedCategory) return;

    try {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await onRefresh();
      toast.success(`Kategória "${name}" vymazaná`, {
        action: {
          label: 'Vrátiť späť',
          onClick: async () => {
            try {
              const { id: _id, created_at: _, ...rest } = deletedCategory;
              await supabase.from('expense_categories').insert([rest]);
              await onRefresh();
              toast.success('Kategória bola obnovená');
            } catch {
              toast.error('Nepodarilo sa obnoviť kategóriu');
            }
          },
        },
      });
    } catch (err: unknown) {
      console.error('Error deleting category:', err);
      toast.error('Chyba pri mazaní kategórie');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white dark:bg-slate-900 rounded-2xl p-6 border shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Spravovať kategórie</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="Nová kategória..."
          className="flex-1 bg-slate-50 dark:bg-slate-800 border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-rose-500"
        />
        <button
          onClick={handleAddCategory}
          className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Pridať
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full group"
          >
            <span className="text-sm">{cat.name}</span>
            <button
              onClick={() => handleDeleteCategory(cat.id, cat.name)}
              className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
