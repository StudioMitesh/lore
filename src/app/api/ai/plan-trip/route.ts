import { NextRequest, NextResponse } from 'next/server';
import { lora } from '@/services/aiLoraService';

export async function POST(request: NextRequest) {
  try {
    const {
      destination,
      country,
      duration,
      startDate,
      interests = [],
      budget = 'moderate',
    } = await request.json();

    if (!destination || !country || !duration || !startDate) {
      return NextResponse.json(
        {
          error: 'Missing required fields: destination, country, duration, startDate',
        },
        { status: 400 }
      );
    }

    if (duration < 1 || duration > 30) {
      return NextResponse.json(
        { error: 'Duration must be between 1 and 30 days' },
        { status: 400 }
      );
    }

    const itinerary = await lora.generateItinerary(
      destination,
      country,
      duration,
      startDate,
      interests,
      budget
    );

    return NextResponse.json({
      success: true,
      itinerary,
      meta: {
        model: 'claude-sonnet-4',
        generated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Itinerary generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate itinerary',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
