import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { purchaseCode, domain } = body;

        if (!purchaseCode || !domain) {
            return NextResponse.json(
                { success: false, error: 'Missing purchaseCode or domain in request.' },
                { status: 400 }
            );
        }

        // Call the central DevSnaplix API server
        const apiUrl = process.env.DEVSNAPLIX_API_URL || 'https://devsnaplix-api.gadohost.com/api/verify';
        
        console.log(`Verifying license against DevSnaplix API at ${apiUrl}...`);

        let response;
        try {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    purchaseCode: purchaseCode.trim(),
                    domain: domain.trim(),
                }),
            });
        } catch (fetchError: any) {
            console.error('Fetch error calling license API:', fetchError);
            return NextResponse.json(
                { success: false, error: `Could not connect to activation server: ${fetchError.message}` },
                { status: 502 }
            );
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
            return NextResponse.json(
                { success: false, error: data.error || 'Verification failed.' },
                { status: response.status }
            );
        }

        // Save license information locally to local MongoDB
        try {
            const db = await getDb();
            await db.collection('settings').updateOne(
                { _id: 'general' as any },
                { 
                    $set: { 
                        isLicenseActive: true, 
                        licenseKey: data.licenseKey,
                        purchaseCode: purchaseCode.trim(),
                        codecanyonUsername: data.buyerUsername || '',
                        activatedAt: new Date()
                    } 
                },
                { upsert: true }
            );
        } catch (dbError: any) {
            console.error('Database error saving license:', dbError);
            return NextResponse.json(
                { 
                    success: false, 
                    error: `License verified successfully, but failed to save to local database: ${dbError.message}. Please check your MONGODB_URI in the .env file.` 
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            licenseKey: data.licenseKey,
            buyerUsername: data.buyerUsername,
            itemName: data.itemName,
            message: 'License activated successfully!'
        });

    } catch (e: any) {
        console.error('Error in local activate route:', e);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
