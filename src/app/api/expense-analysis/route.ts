import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { month, expenses, total } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is missing' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Group expenses by category for the prompt
    const categoryBreakdown = expenses.reduce((acc: any, curr: any) => {
      acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount_eur);
      return acc;
    }, {});

    const breakdownString = Object.entries(categoryBreakdown)
      .map(([cat, val]) => `${cat}: ${Number(val).toFixed(2)}€`)
      .join(', ');

    const prompt = `Analyzuj tieto výdavky za mesiac ${month}:
Celkové výdavky: ${total.toFixed(2)}€
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

