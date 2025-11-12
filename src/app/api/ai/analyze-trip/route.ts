import { NextRequest, NextResponse } from 'next/server';
import { lora } from '@/services/aiLoraService';
import { tripService } from '@/services/tripService';

export async function POST(request: NextRequest) {
  try {
    const { tripId, userId } = await request.json();

    if (!tripId || !userId) {
      return NextResponse.json(
        { error: 'Missing tripId or userId' },
        { status: 400 }
      );
    }

    const trip = await tripService.getTrip(tripId);
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (trip.uid !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const entries = await tripService.getTripEntries(tripId);
    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'No entries found for this trip' },
        { status: 400 }
      );
    }

    const summary = await lora.generateTripSummary(trip, entries);

    return NextResponse.json({
      success: true,
      summary,
      meta: {
        entriesAnalyzed: entries.length,
        model: 'claude-sonnet-4',
        cached: false,
      },
    });
  } catch (error) {
    console.error('Trip analysis error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze trip',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
