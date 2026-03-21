
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getPluginsSettings } from '@/lib/data.actions';
import { ServerPluginsSettings } from '@/lib/server-types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, subject, message, recaptchaToken } = body;

        if (!name || !email || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const pluginsSettings = await getPluginsSettings() as ServerPluginsSettings | null;

        // 1. Verify reCAPTCHA if enabled
        if (pluginsSettings?.captchaProvider === 'google' && pluginsSettings.recaptchaSecretKey) {
            if (!recaptchaToken) {
                return NextResponse.json({ error: 'CAPTCHA verification required' }, { status: 400 });
            }

            const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `secret=${pluginsSettings.recaptchaSecretKey}&response=${recaptchaToken}`,
            });

            const verifyData = await verifyRes.json();
            if (!verifyData.success) {
                return NextResponse.json({ error: 'CAPTCHA verification failed' }, { status: 400 });
            }
        }

        // 2. Save message to MongoDB
        const db = await getDb();
        await db.collection('contacts').insertOne({
            name,
            email,
            subject: subject || 'No Subject',
            message,
            isRead: false,
            createdAt: new Date(),
        });

        return NextResponse.json({ success: true, message: 'Message sent successfully' });

    } catch (error: any) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Mailbox Send API Error:', error);
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
