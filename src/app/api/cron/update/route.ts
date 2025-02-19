import { NextResponse } from 'next/server';
import { processTimeSlot } from '@/lib/process';
import { TimeSlot } from '@/lib/types';

// This endpoint is called by Vercel Cron
export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Process all time slots
    const timeSlots: TimeSlot[] = ['10AM', '3PM', '8PM'];
    const results = await Promise.all(
      timeSlots.map(async (timeSlot) => {
        try {
          await processTimeSlot(timeSlot);
          return { timeSlot, success: true };
        } catch (error) {
          console.error(`Failed to process ${timeSlot}:`, error);
          return { timeSlot, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );
    
    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Automated update failed:', error);
    return NextResponse.json(
      { error: 'Failed to process update' },
      { status: 500 }
    );
  }
} 