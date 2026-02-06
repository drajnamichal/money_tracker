'use client';

import { useState, useRef } from 'react';
import { useRefreshAll } from '@/hooks/use-financial-data';
import { supabase } from '@/lib/supabase';
import { assertSuccess, showError } from '@/lib/error-handling';
import {
  Settings,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileJson,
  Database,
  Shield,
  Clock,
  Loader2,
  FileWarning,
  Trash2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface BackupData {
  version: string;
  exportedAt: string;
  data: {
    asset_accounts: unknown[];
    wealth_records: unknown[];
    income_categories: unknown[];
    income_records: unknown[];
    expense_categories: unknown[];
    expense_records: unknown[];
    budget_expenses: unknown[];
    budget_todo_items: unknown[];
    mortgages: unknown[];
    mortgage_payments: unknown[];
    recurring_payments: unknown[];
    retirement_records: unknown[];
    investments: unknown[];
  };
}

export function SettingsClient() {
  const refreshAll = useRefreshAll();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<BackupData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch all data from Supabase
      const [
        { data: assetAccounts },
        { data: wealthRecords },
        { data: incomeCategories },
        { data: incomeRecords },
        { data: expenseCategories },
        { data: expenseRecords },
        { data: budgetExpenses },
        { data: budgetTodoItems },
        { data: mortgages },
        { data: mortgagePayments },
        { data: recurringPayments },
        { data: retirementRecords },
        { data: investments },
      ] = await Promise.all([
        supabase.from('asset_accounts').select('*'),
        supabase.from('wealth_records').select('*'),
        supabase.from('income_categories').select('*'),
        supabase.from('income_records').select('*'),
        supabase.from('expense_categories').select('*'),
        supabase.from('expense_records').select('*'),
        supabase.from('budget_expenses').select('*'),
        supabase.from('budget_todo_items').select('*'),
        supabase.from('mortgages').select('*'),
        supabase.from('mortgage_payments').select('*'),
        supabase.from('recurring_payments').select('*'),
        supabase.from('retirement_records').select('*'),
        supabase.from('investments').select('*'),
      ]);

      const backup: BackupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: {
          asset_accounts: assetAccounts || [],
          wealth_records: wealthRecords || [],
          income_categories: incomeCategories || [],
          income_records: incomeRecords || [],
          expense_categories: expenseCategories || [],
          expense_records: expenseRecords || [],
          budget_expenses: budgetExpenses || [],
          budget_todo_items: budgetTodoItems || [],
          mortgages: mortgages || [],
          mortgage_payments: mortgagePayments || [],
          recurring_payments: recurringPayments || [],
          retirement_records: retirementRecords || [],
          investments: investments || [],
        },
      };

      // Create and download the file
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `money-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Záloha bola úspešne vytvorená');
    } catch (err) {
      showError(err, 'Chyba pri vytváraní zálohy');
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportPreview(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content) as BackupData;

        // Validate the backup structure
        if (!data.version || !data.data) {
          throw new Error('Neplatný formát zálohy');
        }

        setImportPreview(data);
      } catch (error) {
        console.error('Parse error:', error);
        setImportError(
          error instanceof Error ? error.message : 'Nepodarilo sa načítať súbor'
        );
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importPreview) return;

    setImporting(true);
    try {
      const { data } = importPreview;

      // Import in order (respecting foreign keys)
      // 1. Categories first
      // Helper to upsert a table only if data exists
      const upsertTable = async (table: string, rows: unknown[]) => {
        if (!rows || rows.length === 0) return;
        const { error } = await supabase
          .from(table)
          .upsert(rows, { onConflict: 'id' });
        assertSuccess(error, table);
      };

      // 1. Categories first (foreign key targets)
      await upsertTable('income_categories', data.income_categories);
      await upsertTable('expense_categories', data.expense_categories);

      // 2. Asset accounts
      await upsertTable('asset_accounts', data.asset_accounts);

      // 3. Main records
      await upsertTable('wealth_records', data.wealth_records);
      await upsertTable('income_records', data.income_records);
      await upsertTable('expense_records', data.expense_records);
      await upsertTable('budget_expenses', data.budget_expenses);
      await upsertTable('budget_todo_items', data.budget_todo_items);

      // 4. Mortgage
      await upsertTable('mortgages', data.mortgages);
      await upsertTable('mortgage_payments', data.mortgage_payments);

      // 5. Other
      await upsertTable('recurring_payments', data.recurring_payments);
      await upsertTable('retirement_records', data.retirement_records);
      await upsertTable('investments', data.investments);

      // Refresh all data
      await refreshAll();

      toast.success('Dáta boli úspešne obnovené');
      setImportPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      showError(err, 'Chyba pri obnovovaní dát');
    } finally {
      setImporting(false);
    }
  };

  const cancelImport = () => {
    setImportPreview(null);
    setImportError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getRecordCounts = (data: BackupData['data']) => {
    return [
      { name: 'Účty majetku', count: data.asset_accounts?.length || 0 },
      { name: 'Záznamy majetku', count: data.wealth_records?.length || 0 },
      { name: 'Kategórie príjmov', count: data.income_categories?.length || 0 },
      { name: 'Záznamy príjmov', count: data.income_records?.length || 0 },
      {
        name: 'Kategórie výdavkov',
        count: data.expense_categories?.length || 0,
      },
      { name: 'Záznamy výdavkov', count: data.expense_records?.length || 0 },
      { name: 'Rozpočet bytu', count: data.budget_expenses?.length || 0 },
      { name: 'Todo položky', count: data.budget_todo_items?.length || 0 },
      { name: 'Hypotéky', count: data.mortgages?.length || 0 },
      { name: 'Splátky hypotéky', count: data.mortgage_payments?.length || 0 },
      { name: 'Pravidelné platby', count: data.recurring_payments?.length || 0 },
      { name: 'Dôchodok', count: data.retirement_records?.length || 0 },
      { name: 'Investície', count: data.investments?.length || 0 },
    ];
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="text-slate-600 dark:text-slate-400" />
          Nastavenia
        </h1>
        <p className="text-slate-500 mt-1">
          Zálohovanie a obnovenie dát aplikácie
        </p>
      </div>

      {/* Backup Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Download size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Export dát</h2>
              <p className="text-sm text-slate-500 mt-1">
                Stiahni kompletnú zálohu všetkých dát ako JSON súbor
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
              <Database size={16} className="text-slate-400" />
              <span>Všetky tabuľky a záznamy</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
              <FileJson size={16} className="text-slate-400" />
              <span>Formát JSON (čitateľný)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
              <Shield size={16} className="text-slate-400" />
              <span>Lokálne uloženie na zariadenie</span>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Exportujem...
              </>
            ) : (
              <>
                <Download size={18} />
                Exportovať zálohu
              </>
            )}
          </button>
        </motion.div>

        {/* Import Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Upload size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Import dát</h2>
              <p className="text-sm text-slate-500 mt-1">
                Obnov dáta z predchádzajúcej zálohy
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
              <CheckCircle2 size={16} className="text-slate-400" />
              <span>Validácia pred importom</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
              <Clock size={16} className="text-slate-400" />
              <span>Upsert (aktualizuje existujúce)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-amber-600 dark:text-amber-400">
              <AlertCircle size={16} />
              <span>Prepíše existujúce záznamy</span>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
            id="backup-file"
          />
          <label
            htmlFor="backup-file"
            className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-slate-300 dark:border-slate-600"
          >
            <Upload size={18} />
            Vybrať súbor zálohy
          </label>
        </motion.div>
      </div>

      {/* Import Error */}
      {importError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-6"
        >
          <div className="flex items-start gap-4">
            <FileWarning
              size={24}
              className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5"
            />
            <div>
              <h3 className="font-bold text-rose-800 dark:text-rose-200">
                Chyba pri načítaní súboru
              </h3>
              <p className="text-rose-600 dark:text-rose-400 mt-1">
                {importError}
              </p>
              <button
                onClick={cancelImport}
                className="mt-3 text-sm font-medium text-rose-700 dark:text-rose-300 hover:underline"
              >
                Skúsiť znova
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Import Preview */}
      {importPreview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden"
        >
          <div className="p-6 border-b bg-amber-50 dark:bg-amber-900/20">
            <div className="flex items-start gap-4">
              <AlertCircle
                size={24}
                className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
              />
              <div>
                <h3 className="font-bold text-amber-800 dark:text-amber-200">
                  Potvrdenie importu
                </h3>
                <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
                  Táto akcia prepíše existujúce záznamy s rovnakým ID.
                  Skontrolujte obsah zálohy pred pokračovaním.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                  Verzia zálohy
                </p>
                <p className="font-bold">{importPreview.version}</p>
              </div>
              <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                  Exportované
                </p>
                <p className="font-bold">
                  {new Date(importPreview.exportedAt).toLocaleString('sk-SK')}
                </p>
              </div>
            </div>

            <h4 className="font-bold mb-4 text-sm text-slate-500 uppercase tracking-wider">
              Obsah zálohy
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {getRecordCounts(importPreview.data).map((item) => (
                <div
                  key={item.name}
                  className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl"
                >
                  <p className="text-xs text-slate-500 truncate">{item.name}</p>
                  <p className="text-lg font-bold">{item.count}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t">
              <button
                onClick={cancelImport}
                disabled={importing}
                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Zrušiť
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Importujem...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Potvrdiť import
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Info Section */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Shield size={18} className="text-slate-400" />
          Informácie o zálohovaní
        </h3>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>
              Záloha obsahuje všetky finančné dáta vrátane histórie transakcií,
              investícií a nastavení.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>
              Odporúčame vytvárať zálohu aspoň raz mesačne alebo pred väčšími
              zmenami.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>
              Súbor zálohy je uložený lokálne na vašom zariadení a nie je
              posielaný na žiadne servery.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>
              Pri importe sa existujúce záznamy s rovnakým ID aktualizujú (nie
              duplikujú).
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
