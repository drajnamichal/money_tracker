'use client';

import { useState, useMemo } from 'react';
import { useExpenseData } from '@/hooks/use-financial-data';
import { supabase } from '@/lib/supabase';
import { assertSuccess, showError } from '@/lib/error-handling';
import { ExpenseCategory } from '@/types/financial';
import {
  Tags,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronRight,
  Loader2,
  Home,
  ShoppingCart,
  Utensils,
  Car,
  Heart,
  Gamepad2,
  GraduationCap,
  Shirt,
  Sparkles,
  Gift,
  Briefcase,
  Plane,
  Baby,
  Dog,
  Smartphone,
  CreditCard,
  Landmark,
  Umbrella,
  Wrench,
  Music,
  Film,
  Book,
  Coffee,
  Pizza,
  Dumbbell,
  Stethoscope,
  Pill,
  Fuel,
  Bus,
  Bike,
  ParkingCircle,
  Lightbulb,
  Droplet,
  Flame,
  Wifi,
  Phone,
  Tag,
  LucideIcon,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Available icons for categories
const AVAILABLE_ICONS: { name: string; icon: LucideIcon }[] = [
  { name: 'Home', icon: Home },
  { name: 'ShoppingCart', icon: ShoppingCart },
  { name: 'Utensils', icon: Utensils },
  { name: 'Car', icon: Car },
  { name: 'Heart', icon: Heart },
  { name: 'Gamepad2', icon: Gamepad2 },
  { name: 'GraduationCap', icon: GraduationCap },
  { name: 'Shirt', icon: Shirt },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Gift', icon: Gift },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Plane', icon: Plane },
  { name: 'Baby', icon: Baby },
  { name: 'Dog', icon: Dog },
  { name: 'Smartphone', icon: Smartphone },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'Landmark', icon: Landmark },
  { name: 'Umbrella', icon: Umbrella },
  { name: 'Wrench', icon: Wrench },
  { name: 'Music', icon: Music },
  { name: 'Film', icon: Film },
  { name: 'Book', icon: Book },
  { name: 'Coffee', icon: Coffee },
  { name: 'Pizza', icon: Pizza },
  { name: 'Dumbbell', icon: Dumbbell },
  { name: 'Stethoscope', icon: Stethoscope },
  { name: 'Pill', icon: Pill },
  { name: 'Fuel', icon: Fuel },
  { name: 'Bus', icon: Bus },
  { name: 'Bike', icon: Bike },
  { name: 'ParkingCircle', icon: ParkingCircle },
  { name: 'Lightbulb', icon: Lightbulb },
  { name: 'Droplet', icon: Droplet },
  { name: 'Flame', icon: Flame },
  { name: 'Wifi', icon: Wifi },
  { name: 'Phone', icon: Phone },
  { name: 'Tag', icon: Tag },
];

// Available colors
const AVAILABLE_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
  '#f43f5e', // rose
  '#64748b', // slate
  '#78716c', // stone
];

function getIconComponent(iconName: string): LucideIcon {
  const found = AVAILABLE_ICONS.find((i) => i.name === iconName);
  return found?.icon || Tag;
}

interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
  parent_id: string | null;
}

export default function CategoriesPage() {
  const { categories, refreshCategories } = useExpenseData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    icon: 'Tag',
    color: '#6366f1',
    parent_id: null,
  });

  // Organize categories into parent-child structure
  const organizedCategories = useMemo(() => {
    const parents = categories.filter((c) => !c.parent_id);
    const children = categories.filter((c) => c.parent_id);

    return parents.map((parent) => ({
      ...parent,
      children: children.filter((c) => c.parent_id === parent.id),
    }));
  }, [categories]);

  const startEditing = (category: ExpenseCategory) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      icon: category.icon || 'Tag',
      color: category.color || '#6366f1',
      parent_id: category.parent_id,
    });
    setIsAdding(false);
  };

  const startAdding = (parentId: string | null = null) => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({
      name: '',
      icon: 'Tag',
      color: '#6366f1',
      parent_id: parentId,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', icon: 'Tag', color: '#6366f1', parent_id: null });
    setShowIconPicker(false);
    setShowColorPicker(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Názov kategórie je povinný');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('expense_categories')
          .update({
            name: formData.name.trim(),
            icon: formData.icon,
            color: formData.color,
          })
          .eq('id', editingId);

        assertSuccess(error, 'Aktualizácia kategórie');
        toast.success('Kategória bola aktualizovaná');
      } else {
        // Create new
        const { error } = await supabase.from('expense_categories').insert({
          name: formData.name.trim(),
          icon: formData.icon,
          color: formData.color,
          parent_id: formData.parent_id,
        });
        assertSuccess(error, 'Vytvorenie kategórie');
        toast.success('Kategória bola vytvorená');
      }

      await refreshCategories();
      cancelEdit();
    } catch (err) {
      showError(err, 'Nepodarilo sa uložiť kategóriu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: ExpenseCategory) => {
    // Check if category has children
    const hasChildren = categories.some((c) => c.parent_id === category.id);
    if (hasChildren) {
      toast.error('Najprv odstráňte podkategórie');
      return;
    }

    // Check if category is used in expenses
    const { count } = await supabase
      .from('expense_records')
      .select('*', { count: 'exact', head: true })
      .eq('category', category.name);

    if (count && count > 0) {
      toast.error(`Kategória je použitá v ${count} výdavkoch`);
      return;
    }

    setDeleting(category.id);
    try {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', category.id);

      assertSuccess(error, 'Odstránenie kategórie');

      await refreshCategories();
      toast.success('Kategória bola odstránená');
    } catch (err) {
      showError(err, 'Nepodarilo sa odstrániť kategóriu');
    } finally {
      setDeleting(null);
    }
  };

  const IconComponent = getIconComponent(formData.icon);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Tags className="text-indigo-600 dark:text-indigo-400" />
            Správa kategórií
          </h1>
          <p className="text-slate-500 mt-1">
            Upravuj, pridávaj a odstraňuj kategórie výdavkov
          </p>
        </div>
        <button
          onClick={() => startAdding(null)}
          disabled={isAdding || editingId !== null}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Nová kategória
        </button>
      </div>

      {/* Add new category form */}
      <AnimatePresence>
        {isAdding && !formData.parent_id && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden"
          >
            <div className="p-6">
              <h3 className="font-bold mb-4">Nová hlavná kategória</h3>
              <CategoryForm
                formData={formData}
                setFormData={setFormData}
                showIconPicker={showIconPicker}
                setShowIconPicker={setShowIconPicker}
                showColorPicker={showColorPicker}
                setShowColorPicker={setShowColorPicker}
                onSave={handleSave}
                onCancel={cancelEdit}
                saving={saving}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories list */}
      <div className="space-y-4">
        {organizedCategories.map((parent) => (
          <motion.div
            key={parent.id}
            layout
            className="bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden"
          >
            {/* Parent category */}
            <div className="p-4 border-b bg-slate-50 dark:bg-slate-800/50">
              {editingId === parent.id ? (
                <CategoryForm
                  formData={formData}
                  setFormData={setFormData}
                  showIconPicker={showIconPicker}
                  setShowIconPicker={setShowIconPicker}
                  showColorPicker={showColorPicker}
                  setShowColorPicker={setShowColorPicker}
                  onSave={handleSave}
                  onCancel={cancelEdit}
                  saving={saving}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${parent.color || '#6366f1'}20` }}
                    >
                      {(() => {
                        const Icon = getIconComponent(parent.icon || 'Tag');
                        return (
                          <Icon
                            size={20}
                            style={{ color: parent.color || '#6366f1' }}
                          />
                        );
                      })()}
                    </div>
                    <div>
                      <p className="font-bold">{parent.name}</p>
                      <p className="text-xs text-slate-500">
                        {parent.children?.length || 0} podkategórií
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startAdding(parent.id)}
                      disabled={isAdding || editingId !== null}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 hover:text-indigo-600"
                      title="Pridať podkategóriu"
                    >
                      <Plus size={18} />
                    </button>
                    <button
                      onClick={() => startEditing(parent)}
                      disabled={isAdding || editingId !== null}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 hover:text-blue-600"
                      title="Upraviť"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(parent)}
                      disabled={deleting === parent.id || isAdding || editingId !== null}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 hover:text-rose-600"
                      title="Odstrániť"
                    >
                      {deleting === parent.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Children categories */}
            <div className="divide-y">
              {/* Add subcategory form */}
              <AnimatePresence>
                {isAdding && formData.parent_id === parent.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-indigo-50 dark:bg-indigo-900/20"
                  >
                    <h4 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-3">
                      Nová podkategória
                    </h4>
                    <CategoryForm
                      formData={formData}
                      setFormData={setFormData}
                      showIconPicker={showIconPicker}
                      setShowIconPicker={setShowIconPicker}
                      showColorPicker={showColorPicker}
                      setShowColorPicker={setShowColorPicker}
                      onSave={handleSave}
                      onCancel={cancelEdit}
                      saving={saving}
                      isSubcategory
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {parent.children?.map((child) => (
                <div key={child.id} className="p-4 pl-8">
                  {editingId === child.id ? (
                    <CategoryForm
                      formData={formData}
                      setFormData={setFormData}
                      showIconPicker={showIconPicker}
                      setShowIconPicker={setShowIconPicker}
                      showColorPicker={showColorPicker}
                      setShowColorPicker={setShowColorPicker}
                      onSave={handleSave}
                      onCancel={cancelEdit}
                      saving={saving}
                      isSubcategory
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ChevronRight
                          size={16}
                          className="text-slate-300 dark:text-slate-600"
                        />
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${child.color || '#6366f1'}20` }}
                        >
                          {(() => {
                            const Icon = getIconComponent(child.icon || 'Tag');
                            return (
                              <Icon
                                size={16}
                                style={{ color: child.color || '#6366f1' }}
                              />
                            );
                          })()}
                        </div>
                        <p className="font-medium">{child.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditing(child)}
                          disabled={isAdding || editingId !== null}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-blue-600"
                          title="Upraviť"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(child)}
                          disabled={deleting === child.id || isAdding || editingId !== null}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-rose-600"
                          title="Odstrániť"
                        >
                          {deleting === child.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {(!parent.children || parent.children.length === 0) && (
                <div className="p-4 pl-8 text-sm text-slate-400 italic">
                  Žiadne podkategórie
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {organizedCategories.length === 0 && (
        <div className="text-center py-12">
          <Tags size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500">Zatiaľ nemáte žiadne kategórie</p>
          <button
            onClick={() => startAdding(null)}
            className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Vytvoriť prvú kategóriu
          </button>
        </div>
      )}

      {/* Info */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-bold mb-1">Poznámka</p>
            <p>
              Kategórie, ktoré sú použité vo výdavkoch, nie je možné odstrániť.
              Najprv je potrebné zmeniť kategóriu v príslušných výdavkoch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Category form component
interface CategoryFormProps {
  formData: CategoryFormData;
  setFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;
  showIconPicker: boolean;
  setShowIconPicker: React.Dispatch<React.SetStateAction<boolean>>;
  showColorPicker: boolean;
  setShowColorPicker: React.Dispatch<React.SetStateAction<boolean>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isSubcategory?: boolean;
}

function CategoryForm({
  formData,
  setFormData,
  showIconPicker,
  setShowIconPicker,
  showColorPicker,
  setShowColorPicker,
  onSave,
  onCancel,
  saving,
  isSubcategory,
}: CategoryFormProps) {
  const IconComponent = getIconComponent(formData.icon);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Icon picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowIconPicker(!showIconPicker);
              setShowColorPicker(false);
            }}
            className="w-12 h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 flex items-center justify-center transition-colors"
            style={{ backgroundColor: `${formData.color}20` }}
          >
            <IconComponent size={24} style={{ color: formData.color }} />
          </button>

          <AnimatePresence>
            {showIconPicker && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-14 left-0 z-50 w-72 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-xl border grid grid-cols-6 gap-1"
              >
                {AVAILABLE_ICONS.map(({ name, icon: Icon }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, icon: name });
                      setShowIconPicker(false);
                    }}
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                      formData.icon === name
                        ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    <Icon size={18} />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Color picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowIconPicker(false);
            }}
            className="w-12 h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors overflow-hidden"
          >
            <div
              className="w-full h-full"
              style={{ backgroundColor: formData.color }}
            />
          </button>

          <AnimatePresence>
            {showColorPicker && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-14 left-0 z-50 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-xl border grid grid-cols-7 gap-2"
              >
                {AVAILABLE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, color });
                      setShowColorPicker(false);
                    }}
                    className={cn(
                      'w-8 h-8 rounded-lg transition-transform',
                      formData.color === color
                        ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110'
                        : 'hover:scale-110'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Name input */}
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={isSubcategory ? 'Názov podkategórie' : 'Názov kategórie'}
          className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          autoFocus
        />

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !formData.name.trim()}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl transition-colors"
          >
            {saving ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Check size={20} />
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="p-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
