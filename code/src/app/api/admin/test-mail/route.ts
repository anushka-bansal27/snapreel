import { NextRequest, NextResponse } from 'next/server';
import { sendMail } from '@/lib/mailer';
import { verifyAdminSession } from '@/lib/actions/auth';

export async function POST(req: NextRequest) {
    try {
        const isAdmin = await verifyAdminSession();
        if (!isAdmin) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { to } = body;

        if (!to) {
            return NextResponse.json({ success: false, error: 'Recipient email is required.' }, { status: 400 });
        }

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f172a; margin-bottom: 16px;">Test Email Successful!</h2>
                <p style="color: #334155; line-height: 1.5;">Hello,</p>
                <p style="color: #334155; line-height: 1.5;">This is a test email sent from your SnapReels admin panel. If you are receiving this, your SMTP configuration is working correctly.</p>
                <p style="color: #334155; line-height: 1.5; margin-top: 24px;">Best regards,<br>SnapReels System</p>
            </div>
        `;

        await sendMail({
            to,
            subject: 'SnapReels SMTP Test',
            html
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Test mail error:', e);
        return NextResponse.json({ success: false, error: e.message || 'Failed to send test email.' }, { status: 500 });
    }
}
