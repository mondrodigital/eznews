import { NextResponse } from 'next/server';
import { processTimeSlot, getNextTimeSlot } from '@/lib/process';
import { TimeSlot } from '@/lib/types';

// This endpoint allows manual triggering of updates
export async function POST(request: Request) {
  try {
    const { timeSlot } = await request.json();
    
    // Validate time slot
    if (!['10AM', '3PM', '8PM'].includes(timeSlot)) {
      return NextResponse.json(
        { error: 'Invalid time slot. Must be 10AM, 3PM, or 8PM' },
        { status: 400 }
      );
    }

    // Process the requested time slot
    await processTimeSlot(timeSlot as TimeSlot);
    
    return NextResponse.json({ success: true, timeSlot });
  } catch (error) {
    console.error('Manual update failed:', error);
    return NextResponse.json(
      { error: 'Failed to process update' },
      { status: 500 }
    );
  }
} 