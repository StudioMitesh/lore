import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tripText, photos } = body;

    if (!tripText) {
      return NextResponse.json({ error: 'Trip text is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const prompt = `Generate a comprehensive and engaging trip summary based on the following travel journal entries. Make it personal, vivid, and capture the essence of the journey:

${tripText}

${photos && photos.length > 0 ? `\nThe trip included ${photos.length} photos.` : ''}

Please provide:
1. A compelling title for the trip
2. A 2-3 paragraph summary highlighting key moments, experiences, and emotions
3. Notable highlights (3-5 bullet points)
4. Recommendations for future travelers (if applicable)

Format the response as JSON with the following structure:
{
  "title": "Trip Title",
  "summary": "Full summary text...",
  "highlights": ["highlight 1", "highlight 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a travel writing assistant that creates engaging, personal trip summaries. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'No response from OpenAI' }, { status: 500 });
    }

    let summaryData;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      summaryData = JSON.parse(jsonString);
    } catch (parseError) {
      summaryData = {
        title: 'Trip Summary',
        summary: content,
        highlights: [],
        recommendations: [],
      };
    }

    return NextResponse.json({ summary: summaryData });
  } catch (error: any) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate summary' },
      { status: 500 }
    );
  }
}

