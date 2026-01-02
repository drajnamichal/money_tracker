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

    // Look for table rows. The site seems to use a data table.
    // We'll look for patterns like: <td class="logo">...alt="Bank Name"...</td>...<td class="rate">Rate %</td>
    // A more robust way without cheerio is using regex on the specific parts we need.

    const rates: { bank: string; rate: string }[] = [];

    // This is a simplified regex to catch the bank name and rate.
    // It might need adjustment based on actual HTML structure.
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const bankRegex = /alt="([^"]+)"/;
    const rateRegex = /(\d+,\d+)\s*%/;

    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      const rowHtml = match[1];
      const bankMatch = rowHtml.match(bankRegex);
      const rateMatch = rowHtml.match(rateRegex);

      if (bankMatch && rateMatch) {
        rates.push({
          bank: bankMatch[1],
          rate: rateMatch[1].replace(',', '.') + ' %',
        });
      }
    }

    // Return unique rates, keeping the first (usually best) offer for each bank
    const uniqueRates = Array.from(
      new Map(rates.map((item) => [item.bank, item])).values()
    ).slice(0, 10);

    return NextResponse.json(uniqueRates);
  } catch (error: any) {
    console.error('Error fetching mortgage rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rates' },
      { status: 500 }
    );
  }
}
