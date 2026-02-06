import { NextResponse } from 'next/server';
import { createRateLimiter, getClientIdentifier } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const limiter = createRateLimiter('mortgage-rates', { limit: 20, windowSeconds: 60 });

export async function GET(req: Request) {
  const rateLimit = limiter.check(getClientIdentifier(req));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Príliš veľa požiadaviek. Skúste znova o ${rateLimit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  try {
    const response = await fetch('https://www.financnahitparada.sk/hypoteky', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'sk-SK,sk;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      next: { revalidate: 3600 },
    });

    const html = await response.text();

    if (!html || html.length < 100) {
      return NextResponse.json(
        { error: 'Source site returned no content' },
        { status: 500 }
      );
    }

    const rates: { bank: string; rate: string }[] = [];

    // Extract table rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const bankRegex = /<img[^>]+alt=['"]([^'"]+)['"]/i;
    const rateRegex = /(\d+[,.]\d+)\s*%/g; // Use global to find all and pick the right one

    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      let rowHtml = match[1];

      // CRITICAL: Remove title attributes and icons that contain "action/discount" percentages
      // which are lower than the actual interest rate and appear earlier in the HTML
      rowHtml = rowHtml.replace(/title=['"][\s\S]*?['"]/gi, '');
      rowHtml = rowHtml.replace(/<i[\s\S]*?<\/i>/gi, '');

      const bankMatch = rowHtml.match(bankRegex);

      // Find all percentages in the cleaned row
      const rateMatches = Array.from(rowHtml.matchAll(rateRegex));

      if (bankMatch && rateMatches.length > 0) {
        let bankSlug = bankMatch[1].toLowerCase().replace('-logo', '').trim();

        // The actual interest rate is typically the LAST percentage in the row or after the 5th column
        // In the cleaned rowHtml, the first remaining percentage should be the actual rate
        const actualRate = rateMatches[0][1];

        const bankMap: Record<string, string> = {
          slsp: 'SLSP',
          vub: 'VÚB',
          csob: 'ČSOB',
          'tatra-banka': 'Tatra banka',
          mbank: 'mBank',
          unicredit: 'UniCredit',
          fio: 'Fio banka',
          'prima-banka': 'Prima banka',
          prima: 'Prima banka',
          bks: 'BKS Bank',
          '365-bank': '365.bank',
        };

        const bankName =
          bankMap[bankSlug] ||
          bankSlug.charAt(0).toUpperCase() +
            bankSlug.slice(1).replace(/-/g, ' ');

        rates.push({
          bank: bankName,
          rate: actualRate.replace(',', '.') + ' %',
        });
      }
    }

    // Deduplicate and sort
    const uniqueMap = new Map<string, { bank: string; rate: string }>();
    rates.forEach((item) => {
      if (!uniqueMap.has(item.bank)) {
        uniqueMap.set(item.bank, item);
      }
    });

    const uniqueRates = Array.from(uniqueMap.values())
      .sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))
      .slice(0, 10);

    if (uniqueRates.length === 0) {
      return NextResponse.json({
        error: 'No rates found',
        debug: {
          htmlLength: html.length,
          title: html.match(/<title>(.*?)<\/title>/i)?.[1],
        },
      });
    }

    return NextResponse.json(uniqueRates);
  } catch (error: unknown) {
    console.error('Error fetching mortgage rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rates' },
      { status: 500 }
    );
  }
}
