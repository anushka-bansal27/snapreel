import { NextRequest, NextResponse } from 'next/server';
import { claimRewardAction } from '@/lib/actions';
import { getDb } from '@/lib/mongodb';

export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const db = await getDb();
    const mobileSettings = await db.collection('settings').findOne({ _id: 'mobile' as any });
    if (!apiKey || !mobileSettings?.apiKey || apiKey !== mobileSettings.apiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { uid } = await params;
    const body = await request.json();
    const { taskId } = body;
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }
    const result = await claimRewardAction(uid, taskId, 'android');
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to claim reward' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
