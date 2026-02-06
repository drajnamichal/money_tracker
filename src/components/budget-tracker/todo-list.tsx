import React, { useState } from 'react';
import { TrashIcon, CheckEmoji, CategoryEmoji, PlusEmoji } from './icons';

interface TodoItem {
  id: string;
  text: string;
}

interface ToDoListProps {
  items: TodoItem[];
  onAddItem: (text: string) => void;
  onDeleteItem: (id: string) => void;
}

const ToDoList: React.FC<ToDoListProps> = ({
  items,
  onAddItem,
  onDeleteItem,
}) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAddItem(text);
      setText('');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
        <CategoryEmoji className="w-5 h-5" />
        Zoznam na nákup (To-Do)
      </h2>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Napr. Sušička"
          className="flex-grow block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-sm shadow-sm placeholder-slate-400
            focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:text-slate-200"
        />
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors flex items-center gap-1"
          aria-label="Pridať položku do zoznamu"
        >
          <PlusEmoji className="w-4 h-4" />
          Pridať
        </button>
      </form>

      <div className="mt-4 space-y-2 max-h-[250px] overflow-y-auto pr-2">
        {items.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-center py-4 flex items-center justify-center gap-2">
            <CheckEmoji className="w-5 h-5" />
            Všetko nakúpené! Skvelá práca.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
            >
              <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                {item.text}
              </p>
              <button
                onClick={() => onDeleteItem(item.id)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-400 transition-colors"
                aria-label={`Vymazať položku ${item.text}`}
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ToDoList;
