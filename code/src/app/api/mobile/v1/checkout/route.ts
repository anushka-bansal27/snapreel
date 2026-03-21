import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { createCheckoutSessionAction } from '@/lib/actions';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const apiKey = request.headers.get('x-api-key') || request.nextUrl.searchParams.get('apiKey');
        if (!apiKey) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = await getDb();
        const mobileSetting = await db.collection('settings').findOne({ _id: 'mobile' as any });
        if (!mobileSetting || !mobileSetting.apiKey || mobileSetting.apiKey !== apiKey) {
            return NextResponse.json({ error: 'Unauthorized - Invalid API Key' }, { status: 401 });
        }

        const body = await request.json();
        const { userId, packId, gateway } = body;

        if (!userId || !packId || !gateway) {
            return NextResponse.json({ error: 'Missing required parameters: userId, packId, gateway' }, { status: 400 });
        }

        const result = await createCheckoutSessionAction(userId, packId, gateway);

        if (result.success && result.url) {
            return NextResponse.json({ success: true, url: result.url });
        } else {
            return NextResponse.json({ success: false, error: result.error || 'Failed to create session' }, { status: 400 });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
