import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch('https://www.financnykompas.sk/hypoteka', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    const html = await response.text();

    if (!html || html.length < 100) {
      return NextResponse.json(
        { error: 'Source site returned no content', debug: html?.length },
        { status: 500 }
      );
    }

    const rates: { bank: string; rate: string }[] = [];

    // 1. Try specific table parsing
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const bankRegex = /alt="([^"]+)"|data-bank="([^"]+)"/;
    const rateRegex = /(\d+[,.]\d+)\s*%/;

    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      const rowHtml = match[1];
      const bankMatch = rowHtml.match(bankRegex);
      const rateMatch = rowHtml.match(rateRegex);

      if (bankMatch && rateMatch) {
        const bankName = (bankMatch[1] || bankMatch[2]).trim();
        if (bankName.toLowerCase() !== 'akcia' && bankName.length > 1) {
          rates.push({
            bank: bankName,
            rate: rateMatch[1].replace(',', '.') + ' %',
          });
        }
      }
    }

    // 2. If nothing found, try a very broad search for bank logos and nearby rates
    if (rates.length === 0) {
      const broadRegex = /alt="([^"]+)"[\s\S]{1,500}?>\s*(\d+[,.]\d+)\s*%/g;
      let broadMatch;
      while ((broadMatch = broadRegex.exec(html)) !== null) {
        const bankName = broadMatch[1].trim();
        if (bankName.toLowerCase() !== 'akcia' && bankName.length > 1) {
          rates.push({
            bank: bankName,
            rate: broadMatch[2].replace(',', '.') + ' %',
          });
        }
      }
    }

    // Deduplicate and limit
    const uniqueMap = new Map();
    rates.forEach((item) => {
      if (!uniqueMap.has(item.bank)) {
        uniqueMap.set(item.bank, item);
      }
    });

    const uniqueRates = Array.from(uniqueMap.values()).slice(0, 10);

    // If still empty, return some debug info about the HTML structure
    if (uniqueRates.length === 0) {
      const hasTable = html.includes('<table');
      const hasTbody = html.includes('<tbody');
      return NextResponse.json({
        error: 'No rates found',
        debug: {
          htmlLength: html.length,
          hasTable,
          hasTbody,
          snippet: html.substring(0, 500).replace(/<[^>]*>/g, ' '),
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
