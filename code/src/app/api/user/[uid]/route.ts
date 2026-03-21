import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { deleteFile } from '@/lib/storage-utils';

export const dynamic = 'force-dynamic';

const mapDoc = (doc: any) => {
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { uid: _id.toString(), ...rest };
}

async function verifyRequest(request: NextRequest, targetUid: string) {
  const db = await getDb();

  // Android sends its API key as an additional trust signal. Web requests are
  // authenticated by the Firebase ID token and do not expose the mobile key.
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    const mobileSettings = await db.collection('settings').findOne({ _id: 'mobile' as any });
    if (apiKey !== mobileSettings?.apiKey) {
      return { error: 'Unauthorized: Invalid API Key', status: 401 };
    }
  }

  // Firebase ID token is required for both web and Android.
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

// GET user profile
export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const db = await getDb();
    const { uid } = await params; 

    // Verify that the Firebase user owns this profile.
    const authError = await verifyRequest(request, uid);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    let user = await db.collection('users').findOne({ _id: uid as any });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Auto-generate referral code if missing
    if (!user.referralCode) {
      const pubId = user.publicId || uid.substring(0, 6);
      const generatedCode = `SNAP-${pubId.substring(0, 6).toUpperCase()}`;
      await db.collection('users').updateOne(
        { _id: uid as any },
        { $set: { referralCode: generatedCode, referralCount: 0, referralEarnings: 0 } }
      );
      user.referralCode = generatedCode;
    }

    // Fetch unlocked episodes from MongoDB
    const unlocked = await db.collection('unlocked-episodes').find({ userId: uid }).toArray();
    const unlockedEpisodeIds = unlocked.map(u => u.episodeId);

    // Fetch today's ad watches from MongoDB
    const today = new Date().toISOString().split('T')[0];
    const adWatch = await db.collection('ad-watches').findOne({ userId: uid, date: today });
    const todayAdCount = adWatch ? adWatch.count : 0;

    // Fetch user claims
    const claims = await db.collection('reward-claims').find({ userId: uid }).toArray();
    const tasks = await db.collection('reward-tasks').find({ platform: 'android' }).toArray();
    const tasksMap = new Map(tasks.map(t => [t._id.toString(), t]));
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);

    const claimedTaskIds = claims
      .filter(c => {
        const task = tasksMap.get(c.taskId);
        if (!task) return false;
        if (task.frequency === 'once') return true;
        // daily task - check if claimed today
        const claimedDate = new Date(c.claimedAt);
        return claimedDate >= todayStart;
      })
      .map(c => c.taskId);

    return NextResponse.json({
        ...mapDoc(user),
        unlockedEpisodeIds,
        todayAdCount,
        claimedTaskIds
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`API GET /api/user Error:`, error);
    }
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}

// PATCH user profile
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const db = await getDb();
    const { uid } = await params;

    // Verify that the Firebase user owns this profile.
    const authError = await verifyRequest(request, uid);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    const body = await request.json();

    const { displayName, photoURL, publicId } = body;
    const updateData: { [key: string]: any } = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (photoURL !== undefined) updateData.photoURL = photoURL;
    if (publicId !== undefined) updateData.publicId = publicId;
    
    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    const result = await db.collection('users').updateOne(
      { _id: uid as any },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found to update' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User updated successfully' });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`API PATCH /api/user Error:`, error);
    }
    return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const db = await getDb();
    const { uid } = await params;
    const mobileSettings = await db.collection('settings').findOne({ _id: 'mobile' as any });
    const mobileApiKey = request.headers.get('x-api-key');
    const authorization = request.headers.get('authorization') || '';
    const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    const generalSettings = await db.collection('settings').findOne({ _id: 'general' as any });
    const firebaseApiKey = generalSettings?.firebaseApiKey || '';

    if (!mobileApiKey || mobileApiKey !== mobileSettings?.apiKey || !idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!firebaseApiKey) {
      return NextResponse.json(
        { error: 'Firebase API Key is not configured in Authentication Settings.' },
        { status: 503 },
      );
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
    const lookupData = await lookupResponse.json();
    const verifiedUid = lookupData?.users?.[0]?.localId;
    if (!lookupResponse.ok || verifiedUid !== uid) {
      return NextResponse.json({ error: 'Account verification failed.' }, { status: 401 });
    }

    const authDeleteResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${encodeURIComponent(firebaseApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        cache: 'no-store',
      },
    );
    if (!authDeleteResponse.ok) {
      return NextResponse.json(
        { error: 'For security, sign out and sign in again before deleting your account.' },
        { status: 409 },
      );
    }

    const user = await db.collection('users').findOne({ _id: uid as any });
    await deleteFile(user?.photoURL);

    await Promise.all([
      db.collection('users').deleteOne({ _id: uid as any }),
      db.collection('favorites').deleteMany({ userId: uid }),
      db.collection('history').deleteMany({ userId: uid }),
      db.collection('likes').deleteMany({ userId: uid }),
      db.collection('unlocked-episodes').deleteMany({ userId: uid }),
      db.collection('reward-claims').deleteMany({ userId: uid }),
      db.collection('coin-transactions').deleteMany({ userId: uid }),
      db.collection('ad-watches').deleteMany({ userId: uid }),
      db.collection('purchases').deleteMany({ userId: uid }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('API DELETE /api/user/[uid] Error:', error);
    }
    return NextResponse.json({ error: 'Failed to permanently delete account.' }, { status: 500 });
  }
}
