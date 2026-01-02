import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // We fetch the official daily XML from ECB
    const response = await fetch(
      'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml',
      {
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    const xml = await response.text();

    // Simple regex to extract CZK rate from ECB XML: <Cube currency='CZK' rate='25.242'/>
    const czkMatch = xml.match(
      /<Cube currency=['"]CZK['"]\s+rate=['"]([\d.]+)['"]\/>/
    );

    if (!czkMatch) {
      // Fallback to Frankfurter if ECB XML structure changed or fetch failed
      const fallbackRes = await fetch(
        'https://api.frankfurter.app/latest?from=EUR&to=CZK'
      );
      const fallbackData = await fallbackRes.json();

      if (fallbackData.rates && fallbackData.rates.CZK) {
        return NextResponse.json({
          rate: fallbackData.rates.CZK,
          date: fallbackData.date,
          source: 'Frankfurter (ECB data)',
        });
      }

      throw new Error('Could not find CZK rate in ECB XML or fallback API');
    }

    const rate = parseFloat(czkMatch[1]);

    // Extract date from XML: <Cube time='2024-03-21'>
    const dateMatch = xml.match(/<Cube time=['"]([\d-]+)['"]>/);
    const date = dateMatch
      ? dateMatch[1]
      : new Date().toISOString().split('T')[0];

    return NextResponse.json({
      rate,
      date,
      source: 'ECB Official',
    });
  } catch (error: any) {
    console.error('Error fetching exchange rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rates' },
      { status: 500 }
    );
  }
}
