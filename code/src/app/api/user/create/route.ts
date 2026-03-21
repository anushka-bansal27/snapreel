import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

// Simple in-memory rate limiting to stop bot spam
const ipRateLimit = new Map<string, { count: number, resetTime: number }>();

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    
    if (ip !== 'unknown') {
        const rateData = ipRateLimit.get(ip);
        if (rateData && now < rateData.resetTime) {
            if (rateData.count >= 10) {
                return NextResponse.json({ error: 'Too many accounts created from this IP. Please try again later.' }, { status: 429 });
            }
            rateData.count++;
        } else {
            // Reset every hour (3600000 ms), max 10 signups per hour per IP
            ipRateLimit.set(ip, { count: 1, resetTime: now + 3600000 });
        }
    }

    const db = await getDb();
    const usersCollection = db.collection('users');
    const body = await request.json();
    const { uid, email, displayName, photoURL, phoneNumber, coins } = body;

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ _id: uid as any });
    if (existingUser) {
      return NextResponse.json({ message: 'User profile already exists.' }, { status: 200 });
    }

    const settings = await db.collection('settings').findOne({ _id: 'general' as any });
    const signupBonus = settings?.signupBonus ?? 100;

    const newPublicId = Math.floor(10000000 + Math.random() * 90000000).toString();

    let domain = 'snapreels.local';
    try {
        if (settings?.siteUrl) {
            const url = new URL(settings.siteUrl);
            domain = url.hostname;
        }
    } catch (e) {
        // Fallback to snapreels.local if URL is invalid
    }

    const resolvedEmail = email || `${newPublicId}@${domain}`;
    const resolvedDisplayName = displayName || (email ? email.split('@')[0] : `User ${newPublicId}`);

    const newUserProfile = {
      _id: uid, 
      displayName: resolvedDisplayName,
      email: resolvedEmail,
      phoneNumber: phoneNumber || '',
      photoURL: photoURL || '',
      coins: coins === undefined ? Number(signupBonus) : Number(coins), 
      isVip: false,
      disabled: false,
      createdAt: new Date(),
      publicId: newPublicId,
      referralCode: `SNAP-${newPublicId.substring(0, 6)}`,
      referralCount: 0,
      referralEarnings: 0,
    };

    await usersCollection.insertOne(newUserProfile);

    return NextResponse.json(newUserProfile, { status: 201 });

  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('API User Create Error:', error);
    }
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to create user profile', details: errorMessage }, { status: 500 });
  }
}
