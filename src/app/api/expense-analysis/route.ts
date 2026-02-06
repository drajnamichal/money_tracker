import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { createRateLimiter, getClientIdentifier } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const limiter = createRateLimiter('expense-analysis', { limit: 5, windowSeconds: 60 });

export async function POST(req: Request) {
  const rateLimit = limiter.check(getClientIdentifier(req));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Príliš veľa požiadaviek. Skúste znova o ${rateLimit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  try {
    const { month, expenses, total } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || process.env.OPENAI_KEY;

    if (!apiKey) {
      console.error('Expense Analysis Error: OpenAI API key is missing. Checked: OPENAI_API_KEY, OPEN_API_KEY, OPENAI_KEY');
      return NextResponse.json(
        { error: 'OpenAI API kľúč chýba v nastaveniach (Vercel Environment Variables). Skontrolujte OPENAI_API_KEY.' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Group expenses by category for the prompt
    interface ExpenseInput {
      category?: string;
      amount_eur?: number;
      amount?: number;
    }

    const categoryBreakdown = (expenses as ExpenseInput[]).reduce<Record<string, number>>((acc, curr) => {
      const cat = curr.category || 'Nezaradené';
      acc[cat] = (acc[cat] || 0) + Number(curr.amount_eur || curr.amount || 0);
      return acc;
    }, {});

    const breakdownString = Object.entries(categoryBreakdown)
      .map(([cat, val]) => `${cat}: ${val.toFixed(2)}€`)
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
  } catch (error: unknown) {
    console.error('Expense Analysis Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to analyze expenses';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
