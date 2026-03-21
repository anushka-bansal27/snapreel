import 'server-only';

import { randomBytes } from 'crypto';
import { getDb } from './mongodb';

const VIDEO_SECURITY_SETTINGS_ID = 'video-security';

function isUsableSecret(value: unknown): value is string {
    return typeof value === 'string'
        && value.trim().length >= 32
        && value !== 'your-secure-video-secret-key';
}

/**
 * Returns the installation-specific video signing secret.
 * MongoDB is the source of truth so every PM2 worker sees the same value
 * immediately, without requiring a process restart after installation.
 */
export async function getVideoSecret(): Promise<string> {
    const db = await getDb();
    const settings = db.collection('settings');
    const query = { _id: VIDEO_SECURITY_SETTINGS_ID as any };
    const existing = await settings.findOne(query, { projection: { secret: 1 } });

    if (isUsableSecret(existing?.secret)) {
        return existing.secret.trim();
    }

    const envSecret = process.env.VIDEO_SECRET?.trim();
    const candidate = isUsableSecret(envSecret)
        ? envSecret
        : randomBytes(32).toString('hex');

    if (existing) {
        await settings.updateOne(query, {
            $set: { secret: candidate, updatedAt: new Date() },
        });
        return candidate;
    }

    const stored = await settings.findOneAndUpdate(
        query,
        {
            $setOnInsert: {
                secret: candidate,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        },
        { upsert: true, returnDocument: 'after' }
    );

    if (!isUsableSecret(stored?.secret)) {
        throw new Error('Could not initialize the video signing secret.');
    }

    return stored.secret.trim();
}
