import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { sendMail } from '@/lib/mailer';
import { getDb } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();
        
        if (!email) {
            return NextResponse.json({ success: false, error: 'Email is required.' }, { status: 400 });
        }

        // IP Rate Limiting
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        const today = new Date().toISOString().split('T')[0];
        const rateLimitId = `reset_${today}_${ip}`;
        
        const db = await getDb();
        const generalSettings = await db.collection('settings').findOne({ _id: 'general' as any });
        const maxResets = Number(generalSettings?.maxPasswordResetsPerDay) || 3;

        const rateLimit = await db.collection('rate_limits').findOne({ _id: rateLimitId as any });
        if (rateLimit && rateLimit.count >= maxResets) {
            return NextResponse.json({ success: false, error: 'You have reached the maximum number of password reset requests for today.' }, { status: 429 });
        }

        const admin = await getFirebaseAdmin();
        const resetLink = await admin.auth().generatePasswordResetLink(email);

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f172a; margin-bottom: 16px;">Password Reset Request</h2>
                <p style="color: #334155; line-height: 1.5;">You recently requested a password reset. Click the link below to set a new password:</p>
                <a href="${resetLink}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">Reset Password</a>
                <p style="color: #334155; line-height: 1.5; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
        `;

        await sendMail({
            to: email,
            subject: 'Reset your password',
            html
        });
        
        // Increment reset attempts
        await db.collection('rate_limits').updateOne(
            { _id: rateLimitId as any },
            { $inc: { count: 1 }, $setOnInsert: { createdAt: new Date() } },
            { upsert: true }
        );

        return NextResponse.json({ success: true, message: 'If the email exists, a reset link has been sent.' });

    } catch (e: any) {
        console.error('Forgot password API error:', e);
        // Do not leak if user exists or not, standard security practice, unless it's a specific auth error we want to expose.
        if (e.code === 'auth/user-not-found') {
            return NextResponse.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
        }
        return NextResponse.json({ success: false, error: e.message || 'Failed to send password reset email.' }, { status: 500 });
    }
}
