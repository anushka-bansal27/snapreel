import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

async function hasValidMobileApiKey(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return false;
  const db = await getDb();
  const settings = await db.collection('settings').findOne({ _id: 'mobile' as any });
  return !!settings?.apiKey && settings.apiKey === apiKey;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    if (!(await hasValidMobileApiKey(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const { uid } = await params;
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') || '100');

    const transactions = await db.collection('coin-transactions')
      .find({ userId: uid })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const mapped = transactions.map(t => ({
      id: t._id.toString(),
      userId: t.userId,
      type: t.type,
      amount: t.amount,
      description: t.description,
      createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('API GET /api/user/[uid]/transactions Error:', error);
    }
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
