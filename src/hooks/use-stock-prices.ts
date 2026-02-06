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
 * Also fetches EUR/USD exchange rate for currency conversion.
 * Returns a map of ticker -> current price, auto-refreshes every 5 minutes.
 */
export function useStockPrices(investments: Investment[]) {
  const tickers = investments
    .filter((inv) => inv.ticker)
    .map((inv) => inv.ticker!)
    .filter((t, i, arr) => arr.indexOf(t) === i); // deduplicate

  // Add EUR/USD forex pair if any investment is in USD
  const hasUsd = investments.some((inv) => inv.currency === 'USD');
  const allTickers = hasUsd
    ? [...tickers, 'EURUSD=X']
    : tickers;

  const query = useQuery<StockPricesResponse>({
    queryKey: ['stock-prices', allTickers.join(',')],
    queryFn: async () => {
      if (allTickers.length === 0) {
        return { prices: {}, fetchedAt: new Date().toISOString(), tickerCount: 0 };
      }
      const res = await fetch(`/api/stock-prices?tickers=${allTickers.join(',')}`);
      if (!res.ok) throw new Error('Failed to fetch stock prices');
      return res.json();
    },
    enabled: allTickers.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const prices = query.data?.prices ?? {};

  // EUR/USD rate: EURUSD=X gives "1 EUR = X USD", so USD->EUR = 1/X
  const eurUsdRate = prices['EURUSD=X']?.price ?? 1.08;
  const usdToEur = 1 / eurUsdRate;

  return {
    prices,
    usdToEur,
    fetchedAt: query.data?.fetchedAt,
    isRefreshing: query.isFetching,
    refetch: query.refetch,
  };
}
