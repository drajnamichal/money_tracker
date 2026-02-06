'use client';

import { useState, useRef } from 'react';
import { Loader2, Camera, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/image-utils';
import { toast } from 'sonner';
import type { Investment } from '@/types/financial';

interface PortfolioActionsProps {
  portfolioId: 'default' | 'markusik';
  onAddClick: () => void;
  onRefresh: () => Promise<void>;
  investments: Investment[];
}

export function PortfolioActions({
  portfolioId,
  onAddClick,
  onRefresh,
  investments,
}: PortfolioActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScreenshotUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUpdating(true);
    try {
      const compressedBase64 = await compressImage(file);

      const response = await fetch('/api/portfolio-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressedBase64 }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.investments) {
        interface OcrInvestment {
          name: string;
          ticker?: string;
          shares?: number;
          avg_price?: number;
          current_price: number;
        }

        const updates = (data.investments as OcrInvestment[]).map(
          async (newInv) => {
            const existing = investments.find(
              (i) => i.ticker === newInv.ticker || i.name === newInv.name
            );

            if (existing) {
              return supabase
                .from('investments')
                .update({
                  current_price: newInv.current_price,
                  shares: newInv.shares || existing.shares,
                  avg_price: newInv.avg_price || existing.avg_price,
                })
                .eq('id', existing.id);
            } else {
              const { data: userData } = await supabase.auth.getUser();
              return supabase.from('investments').insert([
                {
                  ...newInv,
                  portfolio_id: portfolioId,
                  user_id: userData.user?.id,
                },
              ]);
            }
          }
        );

        await Promise.all(updates);
        await onRefresh();
        toast.success('Portfólio bolo úspešne aktualizované');
      }
    } catch (error: unknown) {
      console.error('Update error:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Chyba pri aktualizácii portfólia';
      toast.error(message);
    } finally {
      setIsUpdating(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleScreenshotUpload}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUpdating}
        className={`flex items-center gap-2 transition-all font-bold disabled:opacity-50 ${
          portfolioId === 'markusik'
            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
        } text-white px-6 py-3 rounded-2xl shadow-lg dark:shadow-none`}
      >
        {isUpdating ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          <Camera size={20} />
        )}
        <span>{isUpdating ? 'Spracovávam...' : 'Screenshot'}</span>
      </button>
      <button
        onClick={onAddClick}
        className={`${
          portfolioId === 'markusik'
            ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100'
            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
        } text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg dark:shadow-none font-bold`}
      >
        <Plus size={20} />
        <span>Pridať</span>
      </button>
    </div>
  );
}
