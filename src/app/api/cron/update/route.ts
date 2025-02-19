import { NextResponse } from 'next/server';
import { processTimeSlot, getNextTimeSlot, shouldProcess } from '@/lib/process';
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

    const nextTimeSlot = getNextTimeSlot();
    
    // Check if we should process this time slot
    if (!shouldProcess(nextTimeSlot)) {
      return NextResponse.json({
        success: true,
        message: `Not time to process ${nextTimeSlot} yet`
      });
    }

    // Process the next time slot
    await processTimeSlot(nextTimeSlot);
    
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${nextTimeSlot}`
    });
  } catch (error) {
    console.error('Automated update failed:', error);
    return NextResponse.json(
      { error: 'Failed to process update' },
      { status: 500 }
    );
  }
} 