import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { month, expenses, total } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is missing' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Group expenses by category for the prompt
    const categoryBreakdown = expenses.reduce((acc: any, curr: any) => {
      const cat = curr.category || 'Nezaradené';
      acc[cat] = (acc[cat] || 0) + Number(curr.amount_eur || curr.amount || 0);
      return acc;
    }, {});

    const breakdownString = Object.entries(categoryBreakdown)
      .map(([cat, val]) => `${cat}: ${Number(val).toFixed(2)}€`)
      .join(', ');

    const totalNum = Number(total || 0);

    const prompt = `Analyzuj tieto výdavky za mesiac ${month}:
Celkové výdavky: ${totalNum.toFixed(2)}€
Rozdelenie podľa kategórií: ${breakdownString}

Napíš krátke (max 2 vety), výstižné a akčné zhrnutie v slovenčine. Zameraj sa na to, kde sa míňalo najviac a či je tam priestor na úsporu alebo nejaký zaujímavý postreh. Používaj priateľský, ale profesionálny tón.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Si skúsený finančný poradca, ktorý pomáha rodinám spravovať ich rozpočet.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const summary = response.choices[0].message.content;
    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('Expense Analysis Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze expenses' },
      { status: 500 }
    );
  }
}

