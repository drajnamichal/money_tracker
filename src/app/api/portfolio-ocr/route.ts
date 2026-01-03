import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

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

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a portfolio OCR assistant. Extract investment details from the screenshot. For each instrument, find the name, ticker, number of shares, average price, and CURRENT price. Respond ONLY with a JSON object like this: {"investments": [{"name": "ASML", "ticker": "ASML", "shares": 1.4196, "avg_price": 646.76, "current_price": 947.09}, ...]}. Use null if a value is not found.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract investment data from this screenshot:',
            },
            {
              type: 'image_url',
              image_url: {
                url: image,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return NextResponse.json(JSON.parse(content));
  } catch (error: any) {
    console.error('Portfolio OCR Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process screenshot' },
      { status: 500 }
    );
  }
}
