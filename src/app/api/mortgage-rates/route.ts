import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch('https://www.financnykompas.sk/hypoteka', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'sk-SK,sk;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        Referer: 'https://www.google.com/',
      },
      next: { revalidate: 3600 },
    });

    const html = await response.text();

    if (!html || html.length < 100) {
      return NextResponse.json(
        { error: 'Source site returned no content', debug: html?.length },
        { status: 500 }
      );
    }

    const rates: { bank: string; rate: string }[] = [];

    // 1. Try a more generic regex that looks for bank names or logos near rates
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const bankRegex = /(?:alt|data-bank)="([^"]+)"/i;
    const rateRegex = /(\d+[,.]\d+)\s*%/;

    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      const rowHtml = match[1];
      const bankMatch = rowHtml.match(bankRegex);
      const rateMatch = rowHtml.match(rateRegex);

      if (bankMatch && rateMatch) {
        const bankName = bankMatch[1].trim();
        if (
          bankName &&
          !['akcia', 'logo', 'banka'].includes(bankName.toLowerCase())
        ) {
          rates.push({
            bank: bankName,
            rate: rateMatch[1].replace(',', '.') + ' %',
          });
        }
      }
    }

    // 2. Fallback: search for known banks if the above fails
    if (rates.length === 0) {
      const commonBanks = [
        'VÚB',
        'Tatra banka',
        'Slovenská sporiteľňa',
        'ČSOB',
        'Prima banka',
        'mBank',
        '365.bank',
        'Fio banka',
        'UniCredit',
        'BKS Bank',
      ];

      commonBanks.forEach((bank) => {
        const escapedBank = bank.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const bankWithRateRegex = new RegExp(
          `${escapedBank}[\\s\\S]{1,500}?>(\\d+[,.]\\d+)\\s*%`,
          'i'
        );
        const bankMatch = html.match(bankWithRateRegex);
        if (bankMatch) {
          rates.push({
            bank: bank,
            rate: bankMatch[1].replace(',', '.') + ' %',
          });
        }
      });
    }

    // Deduplicate
    const uniqueMap = new Map();
    rates.forEach((item) => {
      if (!uniqueMap.has(item.bank)) {
        uniqueMap.set(item.bank, item);
      }
    });

    const uniqueRates = Array.from(uniqueMap.values())
      .sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))
      .slice(0, 10);

    if (uniqueRates.length === 0) {
      const isBlocked = html.includes('cloudflare') || html.includes('captcha');
      return NextResponse.json({
        error: isBlocked ? 'Blocked by protection' : 'No rates found',
        debug: {
          htmlLength: html.length,
          title: html.match(/<title>(.*?)<\/title>/i)?.[1],
          snippet: html.substring(0, 300).replace(/\s+/g, ' '),
        },
      });
    }

    return NextResponse.json(uniqueRates);
  } catch (error: any) {
    console.error('Error fetching mortgage rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rates' },
      { status: 500 }
    );
  }
}
