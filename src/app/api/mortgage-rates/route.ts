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

    // Debugging: Log if HTML is received but empty
    if (!html || html.length < 100) {
      console.error('Empty or too short HTML received from FinancnyKompas');
      return NextResponse.json(
        { error: 'Source site returned no content' },
        { status: 500 }
      );
    }

    const rates: { bank: string; rate: string }[] = [];

    // Improved scraping: find the table body and then rows
    const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
    const tbodyHtml = tbodyMatch ? tbodyMatch[1] : html;

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const bankRegex = /alt="([^"]+)"|data-bank="([^"]+)"/;
    const rateRegex = /(\d+[,.]\d+)\s*%/;

    let match;
    while ((match = rowRegex.exec(tbodyHtml)) !== null) {
      const rowHtml = match[1];
      const bankMatch = rowHtml.match(bankRegex);
      const rateMatch = rowHtml.match(rateRegex);

      if (bankMatch && rateMatch) {
        const bankName = bankMatch[1] || bankMatch[2];
        // Skip generic "AKCIA" or other tags that might get caught
        if (bankName.toLowerCase() === 'akcia') continue;

        rates.push({
          bank: bankName,
          rate: rateMatch[1].replace(',', '.') + ' %',
        });
      }
    }

    // If still empty, try an even broader search
    if (rates.length === 0) {
      const broadRateRegex = /alt="([^"]+)"[\s\S]{1,200}?>(\d+[,.]\d+)\s*%/g;
      let broadMatch;
      while ((broadMatch = broadRateRegex.exec(tbodyHtml)) !== null) {
        rates.push({
          bank: broadMatch[1],
          rate: broadMatch[2].replace(',', '.') + ' %',
        });
      }
    }

    // Return unique rates, keeping the first (usually best) offer for each bank
    const uniqueMap = new Map();
    rates.forEach((item) => {
      if (!uniqueMap.has(item.bank)) {
        uniqueMap.set(item.bank, item);
      }
    });

    const uniqueRates = Array.from(uniqueMap.values()).slice(0, 10);

    if (uniqueRates.length === 0) {
      console.warn('Scraper found no rates. HTML length:', html.length);
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
