import React, { useState, useRef, useMemo } from 'react';
import {
  MoneyEmoji,
  PlusEmoji,
  AttachmentIcon,
  XIcon,
  ChartIcon,
} from './icons';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { showError } from '@/lib/error-handling';

export const EXPENSE_STRUCTURE = [
  {
    name: 'Bývanie',
    subcategories: [
      'nájom/hypotéka',
      'energie',
      'internet a TV',
      'údržba a opravy',
      'poistenie bývania',
      'vybavenie bytu',
    ],
  },
  {
    name: 'Potraviny',
    subcategories: ['potraviny (obchody)', 'drogéria'],
  },
  {
    name: 'Reštaurácie a kaviarne',
    subcategories: ['reštaurácie', 'kaviarne', 'donáška jedla'],
  },
  {
    name: 'Doprava',
    subcategories: [
      'pohonné hmoty',
      'MHD',
      'servis auta',
      'parkovanie',
      'taxi',
    ],
  },
  {
    name: 'Zdravie',
    subcategories: [
      'lieky',
      'lekári',
      'zubár',
      'doplnky výživy',
      'zdravotné poistenie',
    ],
  },
  {
    name: 'Deti a rodina',
    subcategories: [
      'plienky a výživa',
      'oblečenie',
      'škôlka/škola',
      'krúžky',
      'hračky',
    ],
  },
  {
    name: 'Oblečenie a starostlivosť',
    subcategories: ['oblečenie', 'obuv', 'kozmetika', 'kaderník/barber'],
  },
  {
    name: 'Zábava a voľný čas',
    subcategories: ['streaming', 'šport', 'kultúra', 'hobby'],
  },
  {
    name: 'Cestovanie a dovolenky',
    subcategories: ['ubytovanie', 'doprava', 'aktivity', 'cestovné poistenie'],
  },
  {
    name: 'Predplatné a služby',
    subcategories: ['streamingové služby', 'softvér a aplikácie', 'členstvá'],
  },
  {
    name: 'Finančné náklady',
    subcategories: ['bankové poplatky', 'úroky', 'kurzové rozdiely'],
  },
  {
    name: 'Ostatné',
    subcategories: ['darčeky', 'jednorazové výdavky', 'nezaradené'],
  },
];

interface ExpenseFormProps {
  onAddExpense: (expense: {
    description: string;
    amount: number;
    category: string;
    file?: File;
  }) => Promise<void>;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onAddExpense }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Ostatné: nezaradené');
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const futureValue = useMemo(() => {
    const p = parseFloat(amount);
    if (isNaN(p) || p <= 0) return 0;
    return p * Math.pow(1.0815, 20);
  }, [amount]);

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsSubmitting(true);
    try {
      await onAddExpense({
        description,
        amount: numericAmount,
        category,
        file: file || undefined,
      });
      setDescription('');
      setAmount('');
      setCategory('Ostatné: nezaradené');
      setFile(null);
      setError('');
      setShowSimulation(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      showError(err, 'Chyba pri ukladaní výdavku');
      setError('Chyba pri ukladaní výdavku.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('Súbor je príliš veľký (max 5MB).');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleScanReceipt = async () => {
    if (!file) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const base64Image = await base64Promise;

      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      if (data.description) setDescription(data.description);
      if (data.amount) setAmount(data.amount.toString());
      if (data.category) {
        // Try to find a matching category/subcategory
        const found = EXPENSE_STRUCTURE.find(
          (main) =>
            main.name === data.category ||
            main.subcategories.includes(data.category)
        );
        if (found) {
          if (found.subcategories.includes(data.category)) {
            setCategory(`${found.name}: ${data.category}`);
          } else {
            setCategory(`${found.name}: ${found.subcategories[0]}`);
          }
        }
      }

      toast.success('Bloček úspešne naskenovaný!');
    } catch (err) {
      showError(err, 'Chyba pri skenovaní bločku');
    } finally {
      setIsScanning(false);
    }
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
          {parseFloat(amount) > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowSimulation(!showSimulation)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 hover:underline"
              >
                <ChartIcon className="w-3.5 h-3.5" />
                Čo ak by som to investoval?
              </button>
              <AnimatePresence>
                {showSimulation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                      <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                        Týchto{' '}
                        <span className="font-bold">
                          {formatCurrency(parseFloat(amount))}
                        </span>{' '}
                        by malo v S&P 500 o 20 rokov hodnotu{' '}
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatCurrency(futureValue)}
                        </span>
                        .
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Kategória
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-sm shadow-sm
              focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:text-slate-200"
          >
            {EXPENSE_STRUCTURE.map((main) => (
              <optgroup key={main.name} label={main.name}>
                {main.subcategories.map((sub) => (
                  <option key={sub} value={`${main.name}: ${sub}`}>
                    {sub}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <AttachmentIcon className="w-4 h-4" />
            Príloha (blok/faktúra)
          </label>
          <div className="mt-1 space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              className="hidden"
              id="file-upload"
            />
            {!file ? (
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex items-center justify-center px-4 py-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-500 hover:border-indigo-500 hover:text-indigo-500 transition-colors w-full"
              >
                Klikni pre nahranie súboru
              </label>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between w-full bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700">
                  <span className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
                {file.type.startsWith('image/') && (
                  <button
                    type="button"
                    onClick={handleScanReceipt}
                    disabled={isScanning}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50"
                  >
                    {isScanning ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>
                        Skenujem...
                      </>
                    ) : (
                      <>
                        <ChartIcon className="w-4 h-4" />
                        Skenovať pomocou AI
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting || isScanning}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Ukladám...' : 'Pridať výdavok'}
        </button>
      </form>
    </div>
  );
};

export default ExpenseForm;
