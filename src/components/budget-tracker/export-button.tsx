import React from 'react';
import * as XLSX from 'xlsx';
import { formatCurrency } from '@/lib/utils';
import { ExportIcon } from './icons';

interface ExportButtonProps {
  expenses: any[];
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  expenses,
  totalBudget,
  totalSpent,
  remainingBudget,
  onSuccess,
  onError,
}) => {
  const exportToExcel = () => {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Prepare summary data
      const summaryData = [
        ['Súhrn rozpočtu bytu', ''],
        ['', ''],
        ['Celkový rozpočet', formatCurrency(totalBudget)],
        ['Celkom minuté', formatCurrency(totalSpent)],
        ['Zostáva', formatCurrency(remainingBudget)],
        [
          'Percentuálne minuté',
          `${((totalSpent / totalBudget) * 100).toFixed(2)}%`,
        ],
        ['', ''],
      ];

      // Prepare expenses data
      const expensesHeader = [
        ['Detailný rozpis výdavkov', '', '', ''],
        ['', '', '', ''],
        ['Popis', 'Suma (€)', 'Typ', 'Dátum vytvorenia'],
      ];

      const expensesData = expenses.map((expense) => [
        expense.description,
        expense.amount,
        expense.is_fixed ? 'Fixný' : 'Variabilný',
        expense.created_at
          ? new Date(expense.created_at).toLocaleDateString('sk-SK')
          : 'N/A',
      ]);

      // Create summary worksheet
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

      // Style the summary sheet
      summarySheet['!cols'] = [
        { wch: 25 }, // Column A width
        { wch: 15 }, // Column B width
      ];

      // Create expenses worksheet
      const expensesSheet = XLSX.utils.aoa_to_sheet([
        ...expensesHeader,
        ...expensesData,
      ]);

      // Style the expenses sheet
      expensesSheet['!cols'] = [
        { wch: 40 }, // Description
        { wch: 15 }, // Amount
        { wch: 15 }, // Type
        { wch: 18 }, // Date
      ];

      // Add merge for title cells
      expensesSheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Merge title row
      ];

      // Add worksheets to workbook
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Súhrn');
      XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Výdavky');

      // Generate filename with current date
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      const filename = `rozpocet-bytu-${dateStr}.xlsx`;

      // Write and download the file
      XLSX.writeFile(workbook, filename);

      // Show success notification
      if (onSuccess) {
        onSuccess(`Excel súbor "${filename}" bol úspešne exportovaný!`);
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error);

      // Show error notification
      if (onError) {
        onError('Chyba pri exporte do Excel súboru. Skúste to prosím znova.');
      }
    }
  };

  return (
    <button
      onClick={exportToExcel}
      className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
      title="Exportovať do Excel súboru"
    >
      <ExportIcon className="w-4 h-4" />
      <span className="ml-2">Exportovať do Excel</span>
    </button>
  );
};

export default ExportButton;
