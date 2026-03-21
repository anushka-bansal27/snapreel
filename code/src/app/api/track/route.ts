import { NextResponse } from 'next/server';

/**
 * Tracking endpoint is now disabled to improve performance and save database storage.
 */
export async function POST() {
    return NextResponse.json({ success: true, message: 'Tracking disabled' });
}
