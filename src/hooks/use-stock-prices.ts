'use client';

import { useQuery } from '@tanstack/react-query';
import type { Investment } from '@/types/financial';

interface StockPricesResponse {
  prices: Record<string, { price: number; currency: string }>;
  fetchedAt: string;
  tickerCount: number;
}

/**
 * Fetch live stock prices for investments that have a ticker symbol.
 * Returns a map of ticker → current price, auto-refreshes every 5 minutes.
 */
export function useStockPrices(investments: Investment[]) {
  const tickers = investments
    .filter((inv) => inv.ticker)
    .map((inv) => inv.ticker!)
    .filter((t, i, arr) => arr.indexOf(t) === i); // deduplicate

  const query = useQuery<StockPricesResponse>({
    queryKey: ['stock-prices', tickers.join(',')],
    queryFn: async () => {
      if (tickers.length === 0) {
        return { prices: {}, fetchedAt: new Date().toISOString(), tickerCount: 0 };
      }
      const res = await fetch(`/api/stock-prices?tickers=${tickers.join(',')}`);
      if (!res.ok) throw new Error('Failed to fetch stock prices');
      return res.json();
    },
    enabled: tickers.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // auto-refresh every 5 min
  });

  return {
    prices: query.data?.prices ?? {},
    fetchedAt: query.data?.fetchedAt,
    isRefreshing: query.isFetching,
    refetch: query.refetch,
  };
}
