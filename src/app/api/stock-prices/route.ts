import { NextResponse } from 'next/server';
import { createRateLimiter, getClientIdentifier } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const limiter = createRateLimiter('stock-prices', { limit: 10, windowSeconds: 60 });

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        currency?: string;
        symbol?: string;
      };
    }>;
    error?: { description?: string };
  };
}

/**
 * GET /api/stock-prices?tickers=AAPL,VUSA.L,BTC-USD
 *
 * Fetches current prices from Yahoo Finance for the given ticker symbols.
 * Returns a map of { ticker: { price, currency } }.
 */
export async function GET(req: Request) {
  const rateLimit = limiter.check(getClientIdentifier(req));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Prilis vela poziadaviek. Skuste znova o ${rateLimit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const tickersParam = searchParams.get('tickers');

  if (!tickersParam) {
    return NextResponse.json(
      { error: 'Parameter "tickers" je povinny (napr. ?tickers=AAPL,VUSA.L)' },
      { status: 400 }
    );
  }

  const tickers = tickersParam
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20); // max 20 tickers

  const prices: Record<string, { price: number; currency: string }> = {};

  // Fetch all tickers in parallel
  const results = await Promise.allSettled(
    tickers.map(async (ticker) => {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0',
            },
            next: { revalidate: 300 }, // cache 5 min
          }
        );

        if (!res.ok) return;

        const data: YahooChartResponse = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;

        if (meta?.regularMarketPrice) {
          prices[ticker] = {
            price: meta.regularMarketPrice,
            currency: meta.currency || 'USD',
          };
        }
      } catch {
        // Skip failed tickers silently
      }
    })
  );

  return NextResponse.json({
    prices,
    fetchedAt: new Date().toISOString(),
    tickerCount: Object.keys(prices).length,
  });
}
