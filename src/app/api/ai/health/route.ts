import { NextResponse } from 'next/server';

export async function GET() {
  const configured = !!process.env.ANTHROPIC_API_KEY;
  
  return NextResponse.json({
    status: configured ? 'operational' : 'not_configured',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    features: {
      tripAnalysis: configured,
      recommendations: configured,
      itineraryPlanning: configured,
      captionGeneration: configured,
    },
    message: configured
      ? 'lora is good to go!'
      : 'need the ANTHROPIC_API_KEY for lora',
    pricing: {
      input: '$3 per 1M tokens',
      output: '$15 per 1M tokens',
      estimatedCostPerRequest: '$0.01-0.05',
    },
  });
}