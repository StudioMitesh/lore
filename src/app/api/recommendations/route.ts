import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getFirestore, collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, pastTrips } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const recommendationsRef = doc(db, 'users', userId, 'recommendations', 'latest');
    const cachedDoc = await getDoc(recommendationsRef);

    if (cachedDoc.exists()) {
      const cached = cachedDoc.data();
      const cacheAge = Date.now() - (cached.generatedAt || 0);
      if (cacheAge < 24 * 60 * 60 * 1000) {
        return NextResponse.json({ recommendations: cached.recommendations });
      }
    }

    const tripLocations = pastTrips
      ?.map((trip: any) => ({
        name: trip.name,
        countries: trip.countriesVisited || [],
        description: trip.description || '',
      }))
      .slice(0, 10) || [];

    const prompt = `Based on the user's past travel history, suggest 5-7 new destinations or itineraries they might enjoy. Consider:
- Their travel patterns and preferred regions
- Diversity in recommendations (mix of continents, cultures, activities)
- Practical considerations (accessibility, seasons, etc.)

Past trips:
${JSON.stringify(tripLocations, null, 2)}

Provide recommendations as JSON array with this structure:
[
  {
    "destination": "Destination Name",
    "country": "Country Name",
    "reason": "Why this destination matches their travel style",
    "bestTime": "Best time to visit",
    "highlights": ["highlight 1", "highlight 2", "highlight 3"]
  },
  ...
]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a travel recommendation assistant. Analyze travel patterns and suggest personalized destinations. Always respond with valid JSON array only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'No response from OpenAI' }, { status: 500 });
    }

    let recommendations;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      recommendations = JSON.parse(jsonString);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    await setDoc(recommendationsRef, {
      recommendations,
      generatedAt: Date.now(),
      userId,
    });

    return NextResponse.json({ recommendations });
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

