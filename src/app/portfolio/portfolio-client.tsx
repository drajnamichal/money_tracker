'use client';

import { useState, useMemo } from 'react';
import { Briefcase, Calendar } from 'lucide-react';
import { useInvestmentData } from '@/hooks/use-financial-data';
import { PortfolioActions } from '@/components/portfolio/portfolio-actions';
import { PortfolioContent } from '@/components/portfolio/portfolio-content';
import { AddInstrumentModal } from '@/components/portfolio/add-instrument-modal';
import type { Investment } from '@/types/financial';

export interface PortfolioClientProps {
  initialInvestments: Investment[];
}

export function PortfolioClient({ initialInvestments }: PortfolioClientProps) {
  const { investments, loading, refresh } = useInvestmentData({
    initialInvestments,
  });
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePortfolio, setActivePortfolio] = useState<
    'default' | 'markusik'
  >('default');

  const defaultInvestments = useMemo(
    () =>
      investments.filter(
        (inv) => !inv.portfolio_id || inv.portfolio_id === 'default'
      ),
    [investments]
  );

  const markusikInvestments = useMemo(
    () => investments.filter((inv) => inv.portfolio_id === 'markusik'),
    [investments]
  );

  const handleOpenModal = (pId: 'default' | 'markusik') => {
    setActivePortfolio(pId);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-16 pb-24">
      {/* Portfólio 1: Naše investície */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                Naše investície
              </h2>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Calendar size={12} />
                <span className="text-[10px] font-bold uppercase tracking-tight">
                  Aktualizované:{' '}
                  {new Date().toLocaleDateString('sk-SK', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
            <p className="text-slate-500 mt-1">
              Prehľad tvojho investičného portfólia v akciách a ETF.
            </p>
          </div>
          <PortfolioActions
            portfolioId="default"
            onAddClick={() => handleOpenModal('default')}
            onRefresh={refresh}
            investments={defaultInvestments}
          />
        </div>

        <PortfolioContent
          investments={defaultInvestments}
          portfolioId="default"
          loading={loading}
          search={search}
          setSearch={setSearch}
          cashBalance={7.05}
        />
      </section>

      {/* Oddelovač */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-slate-50 dark:bg-slate-950 text-slate-400">
            <Briefcase size={20} />
          </span>
        </div>
      </div>

      {/* Portfólio 2: Portfolio Markusik */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                Portfolio Markusik
              </h2>
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase rounded-md tracking-widest">
                Samostatné
              </span>
            </div>
            <p className="text-slate-500 mt-1">
              Samostatné portfólio pre Markusika.
            </p>
          </div>
          <PortfolioActions
            portfolioId="markusik"
            onAddClick={() => handleOpenModal('markusik')}
            onRefresh={refresh}
            investments={markusikInvestments}
          />
        </div>

        <PortfolioContent
          investments={markusikInvestments}
          portfolioId="markusik"
          loading={loading}
          search={search}
          setSearch={setSearch}
        />
      </section>

      <AddInstrumentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        portfolioId={activePortfolio}
        onSuccess={refresh}
      />
    </div>
  );
}
