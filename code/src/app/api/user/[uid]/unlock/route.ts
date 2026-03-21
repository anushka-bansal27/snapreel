import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

async function hasValidMobileApiKey(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return false;
  const db = await getDb();
  const settings = await db.collection('settings').findOne({ _id: 'mobile' as any });
  return !!settings?.apiKey && settings.apiKey === apiKey;
}

function queryById(id: string) {
  return ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id as any };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    if (!(await hasValidMobileApiKey(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const { uid } = await params;
    const body = await request.json();
    const { seriesId, episodeId, method } = body;
    if (!seriesId || !episodeId || !['coins', 'ad'].includes(method)) {
      return NextResponse.json({ error: 'Invalid unlock request' }, { status: 400 });
    }

    const user = await db.collection('users').findOne({ _id: uid } as any);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const vipActive = user.isVip === true && (!user.vipExpiry || new Date(user.vipExpiry) > new Date());
    const series = await db.collection('series').findOne(queryById(seriesId));
    const freeCount = Number(series?.freeEpisodesCount ?? 3);
    const episodes = await db.collection('episodes')
      .find({ seriesId })
      .sort({ episodeInSeason: 1 })
      .toArray();
    const requestedIndex = episodes.findIndex(ep => ep._id.toString() === episodeId);
    if (requestedIndex < 0) return NextResponse.json({ error: 'Episode not found' }, { status: 404 });

    const requestedEpisode = episodes[requestedIndex];
    const episodeNumber = Number(requestedEpisode.episodeInSeason || requestedIndex + 1);
    if (vipActive || episodeNumber <= freeCount) {
      return NextResponse.json({ success: true, coins: user.coins ?? 0 });
    }

    const existing = await db.collection('unlocked-episodes').findOne({ userId: uid, episodeId });
    if (existing) return NextResponse.json({ success: true, coins: user.coins ?? 0 });

    if (requestedIndex > 0) {
      const previous = episodes[requestedIndex - 1];
      const previousNumber = Number(previous.episodeInSeason || requestedIndex);
      if (previousNumber > freeCount) {
        const previousUnlocked = await db.collection('unlocked-episodes').findOne({
          userId: uid,
          episodeId: previous._id.toString(),
        });
        if (!previousUnlocked) {
          return NextResponse.json(
            { error: `Unlock episode ${previousNumber} first`, requiredEpisodeNumber: previousNumber },
            { status: 409 },
          );
        }
      }
    }

    let coins = Number(user.coins ?? 0);
    let todayAdCount = 0;
    if (method === 'coins') {
      const monetization = await db.collection('settings').findOne({ _id: 'monetization' as any });
      const cost = Number(monetization?.episodeCost ?? body.cost ?? 10);
      const result = await db.collection('users').updateOne(
        { _id: uid, coins: { $gte: cost } } as any,
        { $inc: { coins: -cost } },
      );
      if (result.modifiedCount === 0) {
        return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 });
      }
      coins -= cost;
      await db.collection('coin-transactions').insertOne({
        userId: uid,
        type: 'spend',
        amount: -cost,
        description: `Unlocked: ${series?.title || 'Series'} - Ep ${episodeNumber}`,
        createdAt: new Date(),
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      const adSettings = await db.collection('ads').findOne({ _id: 'video_player_ad' as any });
      const dailyLimit = Number(adSettings?.dailyWatchLimit ?? 5);
      const adWatch = await db.collection('ad-watches').findOne({ userId: uid, date: today });
      todayAdCount = Number(adWatch?.count ?? 0);
      if (todayAdCount >= dailyLimit) {
        return NextResponse.json({ error: 'Daily ad unlock limit reached' }, { status: 400 });
      }
      todayAdCount += 1;
      await db.collection('ad-watches').updateOne(
        { userId: uid, date: today },
        { $set: { userId: uid, date: today, count: todayAdCount } },
        { upsert: true },
      );
    }

    await db.collection('unlocked-episodes').updateOne(
      { userId: uid, episodeId },
      {
        $set: {
          userId: uid,
          seriesId,
          episodeId,
          method,
          episodeNumber,
          unlockedAt: new Date(),
        },
      },
      { upsert: true },
    );

    return NextResponse.json({ success: true, coins, todayAdCount });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('API POST /api/user/[uid]/unlock Error:', error);
    }
    return NextResponse.json({ error: 'Failed to unlock episode' }, { status: 500 });
  }
}
