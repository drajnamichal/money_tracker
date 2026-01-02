import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
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

    // Finančná Hitparáda table parsing
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const bankRegex = /<img[^>]+alt="([^"]+)"/i;
    const rateRegex = /(\d+[,.]\d+)\s*%/;

    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      const rowHtml = match[1];
      const bankMatch = rowHtml.match(bankRegex);
      const rateMatch = rowHtml.match(rateRegex);

      if (bankMatch && rateMatch) {
        let bankSlug = bankMatch[1].toLowerCase().replace('-logo', '').trim();

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
          rate: rateMatch[1].replace(',', '.') + ' %',
        });
      }
    }

    // Deduplicate and sort
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
      return NextResponse.json({
        error: 'No rates found',
        debug: {
          htmlLength: html.length,
          title: html.match(/<title>(.*?)<\/title>/i)?.[1],
          first1000Chars: html.substring(0, 1000).replace(/\s+/g, ' '),
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
