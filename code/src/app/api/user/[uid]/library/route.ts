import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

async function hasValidMobileApiKey(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return false;

  const db = await getDb();
  const settings = await db.collection('settings').findOne({ _id: 'mobile' as any });
  return !!settings?.apiKey && settings.apiKey === apiKey;
}

/** Build a MongoDB filter that matches _id as ObjectId OR as string */
function buildSeriesFilter(seriesId: string) {
  const filters: any[] = [{ _id: seriesId as any }];
  if (ObjectId.isValid(seriesId)) {
    filters.push({ _id: new ObjectId(seriesId) });
  }
  return { $or: filters };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    if (!(await hasValidMobileApiKey(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const { uid } = await params;
    const [favorites, history, likes] = await Promise.all([
      db.collection('favorites').find({ userId: uid }).sort({ favoritedAt: -1 }).toArray(),
      db.collection('history').find({ userId: uid }).sort({ watchedAt: -1 }).toArray(),
      db.collection('likes').find({ userId: uid }).toArray(),
    ]);

    return NextResponse.json({
      favorites: favorites.map(item => ({ seriesId: item.seriesId })),
      likedSeriesIds: likes.map(item => item.seriesId),
      history: history.map(item => ({
        seriesId: item.seriesId,
        episodeId: item.episodeId,
        episodeInSeason: item.episodeInSeason,
        progress: item.progress ?? 0,
        watchedAt: item.watchedAt instanceof Date ? item.watchedAt.toISOString() : item.watchedAt,
      })),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('API GET /api/user/[uid]/library Error:', error);
    }
    return NextResponse.json({ error: 'Failed to fetch user library' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    if (!(await hasValidMobileApiKey(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const { uid } = await params;
    const body = await request.json();

    switch (body.action) {
      case 'toggleFavorite': {
        if (!body.seriesId) return NextResponse.json({ error: 'Missing seriesId' }, { status: 400 });
        const query = { userId: uid, seriesId: body.seriesId };
        const existing = await db.collection('favorites').findOne(query);
        if (existing) {
          await db.collection('favorites').deleteOne(query);
          return NextResponse.json({ success: true, action: 'removed' });
        }
        await db.collection('favorites').insertOne({ ...query, favoritedAt: new Date() });
        return NextResponse.json({ success: true, action: 'added' });
      }

      case 'toggleLike': {
        if (!body.seriesId) return NextResponse.json({ error: 'Missing seriesId' }, { status: 400 });

        const query = { userId: uid, seriesId: body.seriesId };
        const existing = await db.collection('likes').findOne(query);

        let likesCountInc = 1;
        let action = 'liked';

        if (existing) {
          // Unlike
          await db.collection('likes').deleteOne(query);
          likesCountInc = -1;
          action = 'unliked';
        } else {
          // Like
          await db.collection('likes').insertOne({ ...query, likedAt: new Date() });
        }

        // Use $or filter to match both ObjectId and string _id — this is the key fix
        const seriesFilter = buildSeriesFilter(body.seriesId);
        const updatedSeries = await db.collection('series').findOneAndUpdate(
          seriesFilter,
          { $inc: { likes: likesCountInc } },
          { returnDocument: 'after' }
        );

        const newLikesCount = Math.max(0, (updatedSeries as any)?.likes ?? 0);
        return NextResponse.json({ success: true, action, likes: newLikesCount });
      }

      case 'updateHistory': {
        if (!body.seriesId || !body.episodeId) {
          return NextResponse.json({ error: 'Missing history fields' }, { status: 400 });
        }
        await db.collection('history').updateOne(
          { userId: uid, seriesId: body.seriesId },
          {
            $set: {
              episodeId: body.episodeId,
              episodeInSeason: Number(body.episodeInSeason) || 1,
              progress: Number(body.progress) || 0,
              watchedAt: new Date(),
            },
          },
          { upsert: true },
        );
        return NextResponse.json({ success: true });
      }

      case 'removeHistory': {
        if (!body.seriesId) return NextResponse.json({ error: 'Missing seriesId' }, { status: 400 });
        await db.collection('history').deleteOne({ userId: uid, seriesId: body.seriesId });
        return NextResponse.json({ success: true });
      }

      case 'clearHistory': {
        await db.collection('history').deleteMany({ userId: uid });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('API POST /api/user/[uid]/library Error:', error);
    }
    return NextResponse.json({ error: 'Failed to update user library' }, { status: 500 });
  }
}
