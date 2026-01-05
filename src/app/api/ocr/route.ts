import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || process.env.OPENAI_KEY;

    if (!apiKey) {
      console.error('OCR Error: OpenAI API key is missing. Checked: OPENAI_API_KEY, OPEN_API_KEY, OPENAI_KEY');
      return NextResponse.json(
        { error: 'OpenAI API kľúč chýba v nastaveniach (Vercel Environment Variables). Skontrolujte OPENAI_API_KEY.' },
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
            'You are a receipt OCR assistant. Extract the total amount, the store name (description), and a likely category from these options: Bývanie, Potraviny, Reštaurácie a kaviarne, Doprava, Zdravie, Deti a rodina, Oblečenie a starostlivosť, Zábava a voľný čas, Cestovanie a dovolenky, Predplatné a služby, Finančné náklady, Ostatné. Respond ONLY with a JSON object like this: {"amount": 12.34, "description": "Tesco", "category": "Potraviny"}. If you cannot find a value, use null.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract info from this receipt:',
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
    console.error('OCR Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process receipt' },
      { status: 500 }
    );
  }
}
