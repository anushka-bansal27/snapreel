import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { performDailyCheckInAction } from '@/lib/actions';

export const dynamic = 'force-dynamic';

async function verifyRequest(request: NextRequest, targetUid: string) {
  const db = await getDb();
  
  // 1. Verify API Key
  const mobileSettings = await db.collection('settings').findOne({ _id: 'mobile' as any });
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey || apiKey !== mobileSettings?.apiKey) {
    return { error: 'Unauthorized: Invalid API Key', status: 401 };
  }

  // 2. Verify Firebase ID Token
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) {
    return { error: 'Unauthorized: Missing auth token', status: 401 };
  }
  const idToken = authorization.slice(7).trim();
  if (!idToken) {
    return { error: 'Unauthorized: Empty auth token', status: 401 };
  }

  const generalSettings = await db.collection('settings').findOne({ _id: 'general' as any });
  const firebaseApiKey = generalSettings?.firebaseApiKey || '';
  if (!firebaseApiKey) {
    return { error: 'Service Unavailable: Firebase API Key is not configured', status: 503 };
  }

  const lookupResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      cache: 'no-store',
    },
  );
  if (!lookupResponse.ok) {
    return { error: 'Unauthorized: Invalid auth token', status: 401 };
  }
  const lookupData = await lookupResponse.json();
  const verifiedUid = lookupData?.users?.[0]?.localId;
  if (!verifiedUid || verifiedUid !== targetUid) {
    return { error: 'Forbidden: Access denied to user profile', status: 403 };
  }

  return null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;

    // Enforce API key and User ID token authorization
    const authError = await verifyRequest(request, uid);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    const result = await performDailyCheckInAction(uid);

    if (result.success) {
      // Fetch updated user to return latest coins
      const db = await getDb();
      const user = await db.collection('users').findOne({ _id: uid as any });
      return NextResponse.json({
        success: true,
        reward: result.reward,
        dayNum: result.dayNum,
        coins: user?.coins || 0
      });
    } else {
      return NextResponse.json({ error: result.error || 'Check-in failed' }, { status: 400 });
    }
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('API POST /api/user/[uid]/checkin Error:', error);
    }
    return NextResponse.json({ error: 'Failed to perform daily check-in' }, { status: 500 });
  }
}
