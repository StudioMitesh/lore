import Anthropic from '@anthropic-ai/sdk';
import { Entry, Trip, UserProfile, Itinerary, TripSummary, Recommendation } from '@/lib/types';

class AICache {
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private TTL = 24 * 60 * 60 * 1000; // 24 hours

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

class LoraAIAgent {
  private client: Anthropic;
  private cache: AICache;
  private readonly MODEL = 'claude-sonnet-4-20250514';
  private readonly MAX_TOKENS = 4000;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('no anthropic API key, so no AI features will work');
    }

    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key',
    });

    this.cache = new AICache();
  }

  async generateTripSummary(trip: Trip, entries: Entry[]): Promise<TripSummary> {
    const cacheKey = `summary-${trip.id}-${entries.length}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
        return cached;
    }

    try {
      const context = this.buildTripContext(trip, entries);

      const prompt = `You are a masterful travel storyteller. Analyze this journey and craft a compelling narrative that captures its essence.

# Trip Data
**Name:** ${trip.name}
**Duration:** ${context.stats.duration} days (${trip.startDate} to ${trip.endDate || 'ongoing'})
**Countries:** ${trip.countriesVisited.join(', ')}
**Entries:** ${entries.length} moments captured
**Photos:** ${context.stats.photosShared}

# Journey Highlights
${entries.slice(0, 10).map((e, i) => `
**Day ${i + 1} - ${e.location}, ${e.country}**
"${e.title}"
${e.content.substring(0, 200)}...
`).join('\n')}

# Your Task
Create a travel summary that:
1. Tells the emotional story of this journey
2. Highlights unique and memorable experiences
3. Captures the traveler's personal growth
4. Feels authentic and specific (not generic)

# Output Format (JSON)
{
  "title": "Evocative title that captures the trip's soul (max 60 chars)",
  "overview": "2-3 rich paragraphs that weave the journey into a narrative. Include sensory details, emotional moments, and character development.",
  "highlights": [
    "5-7 specific, vivid highlights with details (not generic)",
    "Focus on unexpected moments and personal discoveries"
  ],
  "topMoments": [
    "3 defining experiences that changed something for the traveler",
    "Moments of insight, challenge, beauty, or connection"
  ],
  "mood": "adventurous|relaxing|cultural|romantic|transformative",
  "essence": "One powerful sentence that distills the entire journey",
  "shareableStory": "A single engaging paragraph (120-150 words) perfect for social media. Make it shareable and emotionally resonant.",
  "travelStyle": {
    "pace": "leisurely|moderate|fast-paced",
    "focus": "cultural-immersion|adventure-seeking|relaxation|local-experiences",
    "vibe": "solo-introspective|social-energetic|romantic|family"
  },
  "insights": {
    "favoritePlace": "The place that left the deepest impression",
    "hiddenGem": "An unexpected discovery",
    "personalGrowth": "How this trip changed the traveler"
  }
}

Be specific, be emotional, be memorable. This is someone's life story.`;

      const message = await this.client.messages.create({
        model: this.MODEL,
        max_tokens: this.MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON response');
      }

      const summary = JSON.parse(jsonMatch[0]);

      const result: TripSummary = {
        ...summary,
        stats: context.stats,
      };

      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Trip summary generation failed:', error);
      throw new Error('Failed to generate trip summary');
    }
  }
  
  async generateRecommendations(
    profile: UserProfile,
    trips: Trip[],
    entries: Entry[],
    limit: number = 5
  ): Promise<Recommendation[]> {
    const cacheKey = `recommendations-${profile.uid}-${entries.length}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const travelProfile = this.buildUserProfile(profile, entries);

      const prompt = `You are an expert travel advisor. Based on this traveler's history, recommend ${limit} perfect destinations.

# Traveler Profile
**Travel Experience:** ${entries.length} trips to ${travelProfile.visitedCountries.length} countries
**Visited:** ${travelProfile.visitedCountries.join(', ')}
**Interests:** ${profile.interests?.join(', ') || 'General exploration'}
**Favorite Places:** ${profile.favoritePlaces?.join(', ') || 'None specified'}
**Languages:** ${profile.languagesSpoken?.join(', ') || 'English'}

# Travel Pattern Analysis
**Most Common Activities:** ${travelProfile.topActivities.join(', ')}
**Preferred Season:** ${travelProfile.preferredSeason}
**Travel Style:** ${travelProfile.travelStyle}
**Budget Pattern:** ${travelProfile.budgetLevel}

# Past Trip Highlights
${trips.slice(0, 3).map(t => 
  `- ${t.name} (${t.countriesVisited.join(', ')}) - ${t.totalEntries} entries`
).join('\n')}

# Your Task
Recommend destinations that:
1. Match their demonstrated interests but are NEW
2. Natural progressions from places they loved
3. Challenge them appropriately (not too easy, not overwhelming)
4. Offer similar vibes with fresh experiences

# Output Format (JSON Array)
[
  {
    "destination": "Specific city or region",
    "country": "Country name",
    "matchScore": 85,
    "reasoning": "2-3 sentences explaining WHY this fits their unique style. Be specific about what from their history led to this recommendation.",
    "bestTimeToVisit": "Optimal season/months",
    "estimatedDuration": "Recommended days",
    "activities": [
      "5 specific activities that match their interests",
      "Be concrete: 'Explore X temple', not just 'sightseeing'"
    ],
    "basedOn": [
      "Similar to their trip to X",
      "Matches their love of Y"
    ],
    "difficulty": "easy|moderate|challenging",
    "budgetLevel": "budget|moderate|luxury",
    "uniqueHook": "The one thing that makes this destination perfect for THEM"
  }
]

Avoid: Generic tourist destinations they've already been to, overly touristy places, destinations that don't match their style.
Prioritize: Hidden gems, cultural depth, authentic experiences, smart progressions.`;

      const message = await this.client.messages.create({
        model: this.MODEL,
        max_tokens: this.MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON response');
      }

      const recommendations = JSON.parse(jsonMatch[0]);

      this.cache.set(cacheKey, recommendations);

      return recommendations;
    } catch (error) {
      console.error('Recommendation generation failed:', error);
      throw new Error('Failed to generate recommendations');
    }
  }

  async generateItinerary(
    destination: string,
    country: string,
    duration: number,
    startDate: string,
    interests: string[],
    budget: 'budget' | 'moderate' | 'luxury'
  ): Promise<Itinerary> {
    const cacheKey = `itinerary-${destination}-${duration}-${budget}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const prompt = `You are a master trip planner. Create a ${duration}-day itinerary for ${destination}, ${country}.

# Trip Parameters
**Destination:** ${destination}, ${country}
**Duration:** ${duration} days
**Start Date:** ${startDate}
**Interests:** ${interests.join(', ') || 'General exploration'}
**Budget:** ${budget}

# Planning Principles
1. **Pacing:** Mix active exploration with rest time
2. **Logistics:** Minimize backtracking, group nearby activities
3. **Authenticity:** Include local experiences, not just tourist traps
4. **Flexibility:** Build in free time for spontaneity
5. **Budget:** Respect the ${budget} budget level

# Output Format (JSON)
{
  "tripName": "Creative name for this itinerary",
  "overview": "2 paragraphs: What makes this itinerary special + key themes",
  "days": [
    {
      "day": 1,
      "date": "${startDate}",
      "theme": "Arrival & Orientation",
      "location": "Specific neighborhood or area",
      "morning": {
        "time": "9:00 AM",
        "activity": "Detailed activity description with specific venue names",
        "duration": "2 hours",
        "why": "Why this activity first/at this time"
      },
      "afternoon": {
        "time": "2:00 PM",
        "activity": "Specific activity with location",
        "duration": "3 hours",
        "why": "Reasoning for placement"
      },
      "evening": {
        "time": "7:00 PM",
        "activity": "Dinner and evening activity",
        "duration": "2-3 hours",
        "why": "Why this ends the day well"
      },
      "transportation": "How to get around (metro, walk, taxi)",
      "estimatedCost": "$50-100",
      "tips": "2-3 practical tips for this day",
      "alternatives": "Backup options if weather is bad or places are closed"
    }
  ],
  "totalEstimatedCost": "$500-800",
  "packingList": [
    "10-15 essential items based on activities and season"
  ],
  "travelTips": [
    "5-7 insider tips about ${destination}",
    "Local customs, best times to visit places, money-saving tricks"
  ],
  "emergencyInfo": {
    "hospitals": "Nearest hospital",
    "police": "Emergency number",
    "embassy": "US Embassy contact"
  }
}

Make it detailed, practical, and exciting. This person will actually follow this plan.`;

      const message = await this.client.messages.create({
        model: this.MODEL,
        max_tokens: 6000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON response');
      }

      const itinerary = JSON.parse(jsonMatch[0]);

      this.cache.set(cacheKey, itinerary);

      return itinerary;
    } catch (error) {
      console.error('Itinerary generation failed:', error);
      throw new Error('Failed to generate itinerary');
    }
  }

  async generateCaption(
    location: string,
    country: string,
    existingContent?: string
  ): Promise<string> {
    try {
      const prompt = `Generate a compelling photo caption for a travel moment in ${location}, ${country}.

${existingContent ? `Context: ${existingContent}` : ''}

Requirements:
- 1-2 sentences maximum
- Personal and authentic (not generic)
- Captures emotion and place
- Naturally includes location
- Shareable on social media

Just return the caption text, nothing else.`;

      const message = await this.client.messages.create({
        model: this.MODEL,
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      return content.text.trim().replace(/^["']|["']$/g, '');
    } catch (error) {
      console.error('Caption generation failed:', error);
      throw new Error('Failed to generate caption');
    }
  }

  private buildTripContext(trip: Trip, entries: Entry[]) {
    const uniqueLocations = new Set(entries.map(e => `${e.location}, ${e.country}`));
    const totalPhotos = entries.reduce((sum, e) => sum + e.mediaUrls.length, 0);
    
    const duration = trip.endDate
      ? Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24))
      : Math.ceil((new Date().getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24));

    return {
      stats: {
        duration,
        totalDays: duration,
        placesVisited: uniqueLocations.size,
        photosShared: totalPhotos,
        entriesPerDay: (entries.length / duration).toFixed(1),
      },
      locations: Array.from(uniqueLocations),
      activities: entries.map(e => e.type),
    };
  }

  private buildUserProfile(profile: UserProfile, entries: Entry[]) {
    const visitedCountries = [...new Set(entries.map(e => e.country))];
    const activityCounts: { [key: string]: number } = {};
    
    entries.forEach(e => {
      activityCounts[e.type] = (activityCounts[e.type] || 0) + 1;
    });

    const topActivities = Object.entries(activityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([activity]) => activity);

    const months = entries.map(e => new Date(e.timestamp).getMonth());
    const seasonCounts = [0, 0, 0, 0];
    months.forEach(m => {
      if (m === 11 || m <= 1) seasonCounts[0]++;
      else if (m <= 4) seasonCounts[1]++;
      else if (m <= 7) seasonCounts[2]++;
      else seasonCounts[3]++;
    });
    const seasons = ['winter', 'spring', 'summer', 'fall'];
    const preferredSeason = seasons[seasonCounts.indexOf(Math.max(...seasonCounts))];

    return {
      visitedCountries,
      topActivities,
      preferredSeason,
      travelStyle: this.inferTravelStyle(entries),
      budgetLevel: this.inferBudgetLevel(entries),
    };
  }

  // for now inferring travel style and budget level are very very low level, defo need to be improved
  private inferTravelStyle(entries: Entry[]): string {
    const keywords = entries.flatMap(e => 
      e.content.toLowerCase().split(/\s+/)
    );

    const styles = {
      cultural: ['museum', 'temple', 'history', 'art', 'traditional'],
      adventure: ['hike', 'climb', 'adventure', 'trail', 'mountain'],
      foodie: ['food', 'restaurant', 'cafe', 'market', 'cooking'],
      relaxation: ['beach', 'spa', 'relax', 'peaceful', 'quiet'],
    };

    let maxScore = 0;
    let detectedStyle = 'explorer';

    for (const [style, indicators] of Object.entries(styles)) {
      const score = indicators.reduce(
        (sum, word) => sum + keywords.filter(k => k.includes(word)).length,
        0
      );
      if (score > maxScore) {
        maxScore = score;
        detectedStyle = style;
      }
    }

    return detectedStyle;
  }

  private inferBudgetLevel(entries: Entry[]): string {
    // simplified - should analyze accommodation mentions, activities, etc.
    if (entries.length === 0) {
        return 'moderate';
    }
    const luxuryKeywords = ['luxury', '5-star', 'expensive', 'fine dining', 'private'];
    const budgetKeywords = ['hostel', 'budget', 'cheap', 'street food', 'backpacker'];
    const content = entries.map(e => e.content.toLowerCase()).join(' ');
    const luxuryScore = luxuryKeywords.reduce(
      (sum, word) => sum + (content.includes(word) ? 1 : 0),
      0
    );
    const budgetScore = budgetKeywords.reduce(
      (sum, word) => sum + (content.includes(word) ? 1 : 0),
      0
    );
    if (luxuryScore > budgetScore + 1) {
      return 'luxury';
    } else if (budgetScore > luxuryScore + 1) {
      return 'budget';
    } else {
      return 'moderate';
    }
  }
}

export const lora = new LoraAIAgent();