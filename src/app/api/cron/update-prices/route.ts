import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        currency?: string;
      };
    }>;
  };
}

/**
 * GET /api/cron/update-prices
 *
 * Cron job that fetches live prices from Yahoo Finance for all
 * investments with a ticker and updates current_price in Supabase.
 *
 * Protected by CRON_SECRET header (set in Vercel environment).
 * Intended to run daily via vercel.json cron config.
 */
export async function GET(req: Request) {
  // Verify cron secret (Vercel sends this automatically for cron jobs)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Create a service-role-like client (uses anon key but cron context)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: () => undefined } }
    );

    // Get all investments with a ticker
    const { data: investments, error } = await supabase
      .from('investments')
      .select('id, ticker, current_price')
      .not('ticker', 'is', null);

    if (error) throw error;
    if (!investments || investments.length === 0) {
      return NextResponse.json({ message: 'No investments with tickers found', updated: 0 });
    }

    // Deduplicate tickers
    const tickerMap = new Map<string, string[]>();
    investments.forEach((inv) => {
      if (!inv.ticker) return;
      const ids = tickerMap.get(inv.ticker) || [];
      ids.push(inv.id);
      tickerMap.set(inv.ticker, ids);
    });

    let updated = 0;
    const errors: string[] = [];

    // Fetch prices and update DB
    for (const [ticker, ids] of tickerMap) {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`,
          { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );

        if (!res.ok) {
          errors.push(`${ticker}: HTTP ${res.status}`);
          continue;
        }

        const data: YahooChartResponse = await res.json();
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;

        if (!price) {
          errors.push(`${ticker}: no price in response`);
          continue;
        }

        // Update all investments with this ticker
        const { error: updateError } = await supabase
          .from('investments')
          .update({
            current_price: price,
            updated_at: new Date().toISOString(),
          })
          .in('id', ids);

        if (updateError) {
          errors.push(`${ticker}: ${updateError.message}`);
        } else {
          updated += ids.length;
        }

        // Small delay to avoid Yahoo rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err) {
        errors.push(`${ticker}: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }

    return NextResponse.json({
      message: `Updated ${updated} investments`,
      updated,
      totalTickers: tickerMap.size,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Cron] update-prices error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
