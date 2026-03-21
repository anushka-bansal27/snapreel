import nodemailer from 'nodemailer';
import { getGeneralSettings } from './data.actions';

export async function sendMail({ to, subject, html }: { to: string, subject: string, html: string }) {
    const settings = await getGeneralSettings();
    
    let transporter;
    
    if (settings?.mailType === 'sendmail') {
        transporter = nodemailer.createTransport({
            sendmail: true,
            newline: 'unix',
            path: '/usr/sbin/sendmail'
        });
    } else {
        if (!settings || !settings.smtpHost || !settings.smtpUser) {
            throw new Error('SMTP configuration is missing. Please configure it in Admin Settings.');
        }

        const secure = settings.smtpEncryption === 'ssl';
        
        transporter = nodemailer.createTransport({
            host: settings.smtpHost,
            port: settings.smtpPort || (secure ? 465 : 587),
            secure: secure,
            auth: {
                user: settings.smtpUser,
                pass: settings.smtpPassword,
            },
            tls: {
                rejectUnauthorized: false,
            }
        });
    }

    const fromName = settings.siteName || 'SnapReels';
    const fromEmail = settings.supportEmail || settings.smtpUser || 'noreply@snapreels.com';

    const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: to,
        subject: subject,
        html: html,
    });

    return info;
}
