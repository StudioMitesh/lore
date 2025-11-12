import { NextRequest, NextResponse } from 'next/server';
import { lora } from '@/services/aiLoraService';
import { tripService } from '@/services/tripService';
import { entryService } from '@/services/entryService';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { userId, limit = 5 } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profile = { id: userDoc.id, ...userDoc.data() } as unknown as UserProfile;

    const [trips, entries] = await Promise.all([
      tripService.getUserTrips(userId),
      entryService.getUserEntries(userId, false),
    ]);

    if (entries.length === 0) {
      return NextResponse.json({
        success: true,
        recommendations: [],
        message: 'Start logging trips to get personalized recommendations!',
      });
    }

    const recommendations = await lora.generateRecommendations(
      profile,
      trips,
      entries,
      limit
    );

    return NextResponse.json({
      success: true,
      recommendations,
      meta: {
        basedOnTrips: trips.length,
        basedOnEntries: entries.length,
        model: 'claude-sonnet-4',
      },
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
