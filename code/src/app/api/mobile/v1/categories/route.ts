import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const apiKey = request.headers.get('x-api-key') || request.nextUrl.searchParams.get('apiKey');
        if (!apiKey) {
            return NextResponse.json({ error: 'Unauthorized - Missing API Key' }, { status: 401 });
        }

        const db = await getDb();
        const settings = await db.collection('settings').findOne({ _id: 'mobile' as any });
        if (!settings || !settings.apiKey || settings.apiKey !== apiKey) {
            return NextResponse.json({ error: 'Unauthorized - Invalid API Key' }, { status: 401 });
        }

        const categories = await db.collection('categories').find({ showOnHomepage: true }).toArray();
        const categoryNames = categories.map(c => c.name);

        return NextResponse.json(categoryNames);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
