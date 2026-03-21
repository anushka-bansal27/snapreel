'use server';

import { z } from 'zod';
import { getDb } from '../mongodb';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { createHash, randomBytes } from 'crypto';
import { getPluginsSettings, getCustomPages, getStorageSettings, getGeneralSettings } from '../data.actions';
import { deleteFile } from '../storage-utils';
import { encryptPath } from '../crypto';
import { translationKeys } from '../translation-keys';
import { ServerPluginsSettings } from '../server-types';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getDemoModeMutationError } from '../demo-mode';
import { getVideoSecret } from '../video-secret';
import { handleError, getQueryById } from './utils';

// Helper callAi import
import { callAi } from './ai';
import fs from 'fs';
import path from 'path';

const slugify = (text: string) => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');

/**
 * Saves or updates custom static pages.
 */
export async function savePageAction(data: any) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    try {
        const { id, ...rest } = data;
        if (id) {
            await db.collection('pages').updateOne(getQueryById(id), { $set: rest });
        } else {
            await db.collection('pages').insertOne(rest);
        }
        revalidatePath('/admin/pages');
        return { success: true };
    } catch (e: any) { return handleError('savePageAction', e, 'Failed to save page.'); }
}

/**
 * Deletes custom static pages.
 */
export async function deletePageAction(id: string) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    try {
        await db.collection('pages').deleteOne(getQueryById(id));
        revalidatePath('/admin/pages');
        return { success: true };
    } catch (e: any) { return handleError('deletePageAction', e, 'Failed to delete page.'); }
}

/**
 * Saves category labels.
 */
export async function saveCategoryAction(data: any) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    try {
        const { id } = data;
        
        // Explicitly allowlist category fields
        const sanitized: any = {};
        if (data.name !== undefined) sanitized.name = typeof data.name === 'string' ? data.name : '';
        if (data.slug !== undefined) sanitized.slug = typeof data.slug === 'string' ? data.slug : '';
        if (data.showOnHomepage !== undefined) sanitized.showOnHomepage = Boolean(data.showOnHomepage);

        if (id) {
            await db.collection('categories').updateOne(getQueryById(id), { $set: sanitized });
        } else {
            await db.collection('categories').insertOne(sanitized);
        }
        revalidatePath('/admin/categories');
        return { success: true };
    } catch (e: any) { return handleError('saveCategoryAction', e, 'Failed to save category.'); }
}

/**
 * Deletes category labels.
 */
export async function deleteCategoryAction(id: string) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    try {
        await db.collection('categories').deleteOne(getQueryById(id));
        revalidatePath('/admin/categories');
        return { success: true };
    } catch (e: any) { return handleError('deleteCategoryAction', e, 'Failed to delete category.'); }
}

/**
 * Saves general site settings configurations.
 */
export async function saveGeneralSettingsAction(data: any) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    try {
        const current = await db.collection('settings').findOne({ _id: 'general' as any });
        
        // Clean up old logo if changed
        if (current?.logoUrl && data.logoUrl && current.logoUrl !== data.logoUrl) {
            await deleteFile(current.logoUrl);
        }
        // Clean up old favicon if changed
        if (current?.faviconUrl && data.faviconUrl && current.faviconUrl !== data.faviconUrl) {
            await deleteFile(current.faviconUrl);
        }
        // Clean up old watermark if changed
        if (current?.watermarkUrl && data.watermarkUrl && current.watermarkUrl !== data.watermarkUrl) {
            await deleteFile(current.watermarkUrl);
        }

        // Explicitly allowlist and sanitize general settings keys. Exclude licensing keys.
        const sanitized: any = {};
        const allowedKeys = [
            'siteName', 'siteUrl', 'logoUrl', 'faviconUrl', 'copyrightText',
            'appVersion', 'seriesUrlFormat', 'defaultLanguageCode',
            'showSocialsInFooter', 'showSiteNameNextToLogo', 'showCopyright',
            'showVersion', 'episodesPerPage', 'appStoreUrl', 'playStoreUrl',
            'apiKey', 'emailLoginEnabled', 'googleLoginEnabled', 'facebookLoginEnabled', 'appleLoginEnabled',
            'firebaseConfigRaw', 'firebaseApiKey', 'firebaseAuthDomain', 'firebaseProjectId',
            'firebaseStorageBucket', 'firebaseMessagingSenderId', 'firebaseAppId', 'firebaseMeasurementId', 'firebaseServiceAccount', 'signupBonus', 'phoneLoginEnabled', 'supportEmail', 'smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword', 'smtpEncryption', 'mailType',
            'seoTitle', 'seoDescription', 'seoKeywords', 'robotsTxt',
            'maxFailedLoginsPerIp', 'maxPasswordResetsPerDay',
            'referralEnabled', 'referralRewardCoins', 'referredBonusCoins',
            'watermarkEnabled', 'watermarkUrl', 'watermarkPosition', 'watermarkOpacity'
        ];
        for (const key of allowedKeys) {
            if (data[key] !== undefined) {
                if (typeof data[key] === 'boolean') {
                    sanitized[key] = data[key];
                } else if (typeof data[key] === 'number') {
                    sanitized[key] = data[key];
                } else {
                    sanitized[key] = typeof data[key] === 'string' ? data[key] : '';
                }
            }
        }
        if (data.socials && typeof data.socials === 'object') {
            sanitized.socials = {};
            const socialsKeys = ['facebook', 'instagram', 'tiktok', 'youtube', 'twitter'];
            for (const sKey of socialsKeys) {
                if (data.socials[sKey] !== undefined) {
                    sanitized.socials[sKey] = typeof data.socials[sKey] === 'string' ? data.socials[sKey] : '';
                }
            }
        }

        await db.collection('settings').updateOne({ _id: 'general' as any }, { $set: sanitized }, { upsert: true });
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (e: any) { return handleError('saveGeneralSettingsAction', e, 'Failed to save general settings.'); }
}

/**
 * Saves payment integration configurations.
 */
export async function savePaymentSettingsAction(data: any) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    try {
        const current = await db.collection('settings').findOne({ _id: 'payment' as any });
        
        // Cleanup old gateway logos if they changed
        const gateways = ['stripe', 'paypal', 'razorpay', 'flutterwave', 'phonepe', 'cashfree', 'payu'];
        for (const gw of gateways) {
            const key = `${gw}LogoUrl`;
            if (current?.[key] && data[key] && current[key] !== data[key]) {
                await deleteFile(current[key]);
            }
        }

        // Explicitly allowlist and sanitize payment gateway settings keys
        const sanitized: any = {};
        const allowedKeys = [
            'stripeEnabled', 'stripePublishableKey', 'stripeSecretKey', 'stripeLogoUrl',
            'paypalEnabled', 'paypalClientId', 'paypalSecret', 'paypalLogoUrl', 'paypalMode',
            'razorpayEnabled', 'razorpayKeyId', 'razorpayKeySecret', 'razorpayLogoUrl',
            'flutterwaveEnabled', 'flutterwavePublicKey', 'flutterwaveSecretKey', 'flutterwaveLogoUrl',
            'googlePayEnabled', 'googlePlayPackageName', 'googlePlayServiceAccountEmail', 'googlePlayServiceAccountPrivateKey',
            'phonepeEnabled', 'phonepeMerchantId', 'phonepeAppId', 'phonepeLogoUrl', 'phonepeSaltKey', 'phonepeSaltIndex',
            'cashfreeEnabled', 'cashfreeAppId', 'cashfreeLogoUrl', 'cashfreeSecretKey',
            'payuEnabled', 'payuMerchantKey', 'payuLogoUrl', 'payuMerchantSalt'
        ];
        for (const key of allowedKeys) {
            if (data[key] !== undefined) {
                if (key.endsWith('Enabled')) {
                    sanitized[key] = Boolean(data[key]);
                } else {
                    sanitized[key] = typeof data[key] === 'string' ? data[key] : '';
                }
            }
        }

        await db.collection('settings').updateOne({ _id: 'payment' as any }, { $set: sanitized }, { upsert: true });
        revalidatePath('/admin/settings/payment-gateway');
        return { success: true };
    } catch (e: any) { return handleError('savePaymentSettingsAction', e, 'Failed to save payment settings.'); }
}

/**
 * Saves enabled plugins settings.
 */
export async function savePluginsSettingsAction(data: any) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    try {
        const current = await db.collection('settings').findOne({ _id: 'plugins' as any });

        // Explicitly allowlist and sanitize plugin settings keys
        const sanitized: any = {};
        const allowedKeys = [
            'gaId', 'captchaProvider', 'recaptchaVersion', 'recaptchaSiteKey', 'recaptchaSecretKey',
            'cloudflareSiteKey', 'cloudflareSecretKey', 'hcaptchaSiteKey', 'hcaptchaSecretKey',
            'videoProtectionEnabled', 'videoRotationPeriod', 'aiProvider', 'groqEnabled', 'groqApiKey',
            'openaiEnabled', 'openaiApiKey', 'geminiEnabled', 'geminiApiKey', 'oneSignalAppId',
            'oneSignalApiKey', 'oneSignalPromptDelay', 'indexNowEnabled', 'indexNowKey'
        ];
        for (const key of allowedKeys) {
            if (data[key] !== undefined) {
                if (key.endsWith('Enabled') || key === 'videoProtectionEnabled') {
                    sanitized[key] = Boolean(data[key]);
                } else if (key === 'oneSignalPromptDelay') {
                    sanitized[key] = Number(data[key]) || 0;
                } else {
                    sanitized[key] = typeof data[key] === 'string' ? data[key] : '';
                }
            }
        }

        await db.collection('settings').updateOne({ _id: 'plugins' as any }, { $set: sanitized }, { upsert: true });

        // Delete old IndexNow Key file if it exists and changed
        const oldKey = current?.indexNowKey;
        if (oldKey && oldKey !== sanitized.indexNowKey) {
            try {
                const oldPath = path.join(process.cwd(), 'public', `${oldKey}.txt`);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            } catch (e) {
                console.error('Failed to delete old IndexNow file:', e);
            }
        }

        // Write IndexNow Key to public directory
        if (sanitized.indexNowEnabled && sanitized.indexNowKey) {
            try {
                const publicPath = path.join(process.cwd(), 'public', `${sanitized.indexNowKey}.txt`);
                fs.writeFileSync(publicPath, sanitized.indexNowKey, 'utf8');
            } catch (e) {
                console.error('Failed to write IndexNow file to public directory:', e);
            }
        }

        revalidatePath('/admin/settings/plugins');
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (e: any) { return handleError('savePluginsSettingsAction', e, 'Failed to save plugins settings.'); }
}

/**
 * Calls AI translation service to populate language translation keys.
 */
export async function translateLanguageAction(languageCode: string, languageName: string) {
    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;

    // Sanitize and validate inputs to prevent prompt injection
    const codeRegex = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,4})?$/;
    const nameRegex = /^[\p{L}\p{M}\s\-\(\)]{2,50}$/u;
    if (!codeRegex.test(languageCode) || !nameRegex.test(languageName)) {
        return { success: false, error: 'Invalid language parameters. Only standard locale codes and names are allowed.' };
    }

    try {
        const defaultTranslations = translationKeys.reduce((acc, item) => {
            acc[item.key] = item.default;
            return acc;
        }, {} as Record<string, string>);

        const pages = await getCustomPages();
        pages.forEach(page => {
            defaultTranslations[`page_title_${page.slug}`] = page.title;
            defaultTranslations[`page_content_${page.slug}`] = page.content;
        });

        const settings = await getPluginsSettings() as ServerPluginsSettings | null;
        const provider = settings?.aiProvider || 'groq';

        let translatedJson: Record<string, any> = {};

        if (provider === 'groq') {
            // Groq free tier has a 1,000 output tokens/minute limit.
            // Batch into smaller chunks of ~35 keys to guarantee 100% success rate without 429 errors.
            const entries = Object.entries(defaultTranslations);
            const batchSize = 35;
            for (let i = 0; i < entries.length; i += batchSize) {
                const chunk = Object.fromEntries(entries.slice(i, i + batchSize));
                const chunkPrompt = `You are an expert translator and localizer.
Target Language: ${languageName}
Target Locale Code: ${languageCode}
Return ONLY a valid JSON object translating the values for the following keys:
${JSON.stringify(chunk)}`;

                const chunkContent = await callAi(chunkPrompt, true);
                if (chunkContent) {
                    try {
                        const parsed = JSON.parse(chunkContent);
                        Object.assign(translatedJson, parsed);
                    } catch {
                        try {
                            const cleaned = chunkContent.substring(chunkContent.indexOf('{'), chunkContent.lastIndexOf('}') + 1);
                            Object.assign(translatedJson, JSON.parse(cleaned));
                        } catch {
                            const matches = [...chunkContent.matchAll(/"([^"]+)":\s*"((?:[^"\\]|\\.)*)"/g)];
                            matches.forEach(m => {
                                translatedJson[m[1]] = m[2].replace(/\\"/g, '"').replace(/\\n/g, '\n');
                            });
                        }
                    }
                }
            }
        } else {
            // Gemini & OpenAI handle large prompts effortlessly in a single high-speed call
            const systemPrompt = `You are an expert translator and localizer.
Target Language: ${languageName}
Target Locale Code: ${languageCode}

CRITICAL INSTRUCTIONS:
1. SCRIPT ISOLATION: You MUST only use characters belonging to the ${languageName} script. 
   - If Target is Arabic: Use ONLY Arabic script. No Latin, Chinese, Japanese, or Cyrillic characters allowed.
   - If Target is Chinese: Use ONLY Chinese script.
2. NO HALLUCINATIONS: Do not mix words from other languages in the middle of sentences. 
3. BRAND INTEGRITY: The brand name is "SnapReels". Transliterate it naturally or translate it if appropriate for the target culture, but do not mix scripts within the brand name.
4. JSON FORMAT: Return a valid JSON object ONLY. Every key from the input must exist in the output.
5. HTML TAGS: Preserve HTML tags (<p>, <br>, <strong>, etc.) exactly. Do not translate the tag names.
6. PROFESSIONAL TONE: Use a tone suitable for a high-end streaming service.

INPUT JSON: ${JSON.stringify(defaultTranslations)}`;

            const content = await callAi(systemPrompt, true);
            if (!content) throw new Error('AI returned an empty response');

            try {
                translatedJson = JSON.parse(content);
            } catch (e) {
                try {
                    const cleaned = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
                    translatedJson = JSON.parse(cleaned);
                } catch (e2) {
                    const matches = [...content.matchAll(/"([^"]+)":\s*"((?:[^"\\]|\\.)*)"/g)];
                    if (matches.length > 20) {
                        matches.forEach(m => {
                            translatedJson[m[1]] = m[2].replace(/\\"/g, '"').replace(/\\n/g, '\n');
                        });
                    } else {
                        throw e;
                    }
                }
            }
        }

        const db = await getDb();
        await db.collection('translations').updateOne({ _id: languageCode as any }, { $set: translatedJson }, { upsert: true });
        
        revalidatePath('/', 'layout');
        return { success: true };
    } catch(e: any) { 
        const msg = (e?.error?.message || e?.message || '').toLowerCase();
        if (msg.includes('rate limit') || msg.includes('429') || msg.includes('rate_limit') || msg.includes('tokens per minute')) {
            return { success: false, error: 'AI Rate limit reached. Please wait a moment or switch to Gemini in Settings > Plugins.' };
        }
        if (msg.includes('api key') || msg.includes('configured')) {
            return { success: false, error: 'AI API Key is missing or invalid. Check Plugins Settings.' };
        }
        return handleError('translateLanguageAction', e, 'AI Translation failed. Please check Plugins Settings.'); 
    }
}

/**
 * Adds language profiles.
 */
export async function saveLanguageAction(data: any) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    try {
        const { id, ...rest } = data;
        if (id) {
            await db.collection('languages').updateOne(getQueryById(id), { $set: rest });
        } else {
            await db.collection('languages').insertOne(rest);
        }
        revalidatePath('/admin/languages');
        return { success: true };
    } catch (e: any) { return handleError('saveLanguageAction', e, 'Failed to save language.'); }
}

/**
 * Removes language profiles.
 */
export async function deleteLanguageAction(id: string) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    try {
        const lang = await db.collection('languages').findOne(getQueryById(id));
        if (lang && lang.languageCode) {
            await db.collection('translations').deleteOne({ _id: lang.languageCode as any });
        }
        await db.collection('languages').deleteOne(getQueryById(id));
        revalidatePath('/admin/languages');
        return { success: true };
    } catch (e: any) { return handleError('deleteLanguageAction', e, 'Failed to delete language.'); }
}

/**
 * Saves or updates drama series records and handles cover image cleanup.
 */
export async function saveSeriesAction(seriesData: any) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    try {
        const { id, ...data } = seriesData;
        let targetId = id;
        
        if (id) {
            const current = await db.collection('series').findOne(getQueryById(id));
            // Cleanup old cover if changed
            if (current?.coverUrl && data.coverUrl && current.coverUrl !== data.coverUrl) {
                await deleteFile(current.coverUrl);
            }
            if (current?.featuredCoverUrl && data.featuredCoverUrl && current.featuredCoverUrl !== data.featuredCoverUrl) {
                await deleteFile(current.featuredCoverUrl);
            }
            await db.collection('series').updateOne(getQueryById(id), { $set: { ...data, updatedAt: new Date() } });
        }
        else {
            const res = await db.collection('series').insertOne({
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
                views: data.views !== undefined ? data.views : 0,
                likes: data.likes !== undefined ? data.likes : 0,
                cast: []
            });
            targetId = res.insertedId.toString();
        }

        if (data.genres && Array.isArray(data.genres)) {
            const categoriesCollection = db.collection('categories');
            for (const genreName of data.genres) {
                const slug = slugify(genreName);
                await categoriesCollection.updateOne({ slug }, { $setOnInsert: { name: genreName, slug, showOnHomepage: false } }, { upsert: true });
            }
        }
        
        // IndexNow SEO Ping
        try {
            const plugins = await getPluginsSettings() as any;
            if (plugins && plugins.indexNowEnabled && plugins.indexNowKey) {
                const genSettings = await getGeneralSettings();
                if (genSettings?.siteUrl) {
                    const baseUrl = genSettings.siteUrl.endsWith('/') ? genSettings.siteUrl.slice(0, -1) : genSettings.siteUrl;
                    const identifier = (genSettings.seriesUrlFormat === 'hash' && data.hashId) ? data.hashId : (data.slug || targetId);
                    const finalUrl = `${baseUrl}/series/${identifier}`;
                    const pingUrl = `https://www.bing.com/indexnow?url=${encodeURIComponent(finalUrl)}&key=${plugins.indexNowKey}`;
                    await fetch(pingUrl, { method: 'GET' }).catch(() => {});
                }
            }
        } catch (e) {
            // Ignore ping errors
        }
        
        revalidatePath('/admin/series');
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (e: any) { return handleError('saveSeriesAction', e, 'Failed to save series.'); }
}

/**
 * Deletes a series along with its cover photo and all associated episodes.
 */
export async function deleteSeriesAction(id: string) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    try {
        const series = await db.collection('series').findOne(getQueryById(id));
        if (series?.coverUrl) {
            await deleteFile(series.coverUrl);
        }
        if (series?.featuredCoverUrl) {
            await deleteFile(series.featuredCoverUrl);
        }

        await db.collection('series').deleteOne(getQueryById(id));
        
        // Also delete episodes and their files
        const episodes = await db.collection('episodes').find({ seriesId: id }).toArray();
        for (const ep of episodes) {
            if (ep.videoSources && Array.isArray(ep.videoSources)) {
                for (const src of ep.videoSources) {
                    if (src.url) await deleteFile(src.url);
                }
            }
            if (ep.videoUrl) {
                await deleteFile(ep.videoUrl);
            }
        }
        await db.collection('episodes').deleteMany({ seriesId: id });
        
        revalidatePath('/admin/series');
        return { success: true };
    } catch (e: any) { return handleError('deleteSeriesAction', e, 'Failed to delete series.'); }
}

/**
 * Saves or updates episode details and manages video upload files cleanup.
 */
export async function saveEpisodeAction(episodeData: any) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    try {
        const { id, ...data } = episodeData;
        if (id) {
            const current = await db.collection('episodes').findOne(getQueryById(id));
            if (current) {
                // Cleanup old video file if videoUrl changed
                if (current.videoUrl && data.videoUrl && current.videoUrl !== data.videoUrl) {
                    await deleteFile(current.videoUrl);
                }
                // Cleanup old files from videoSources if they are no longer used
                if (current.videoSources && data.videoSources) {
                    const oldUrls = current.videoSources.map((s: any) => s.url).filter(Boolean);
                    const newUrls = new Set(data.videoSources.map((s: any) => s.url).filter(Boolean));
                    for (const oldUrl of oldUrls) {
                        if (!newUrls.has(oldUrl)) {
                            await deleteFile(oldUrl);
                        }
                    }
                }
                // Cleanup old files from subtitles if they are no longer used
                if (current.subtitles && data.subtitles) {
                    const oldSubUrls = current.subtitles.map((s: any) => s.url).filter(Boolean);
                    const newSubUrls = new Set(data.subtitles.map((s: any) => s.url).filter(Boolean));
                    for (const oldSubUrl of oldSubUrls) {
                        if (!newSubUrls.has(oldSubUrl)) {
                            await deleteFile(oldSubUrl);
                        }
                    }
                }
            }
            await db.collection('episodes').updateOne(getQueryById(id), { $set: data }, { upsert: true });
        }
        else await db.collection('episodes').insertOne(data);
        revalidatePath(`/admin/series/${data.seriesId}/episodes`);
        return { success: true };
    } catch (e: any) { return handleError('saveEpisodeAction', e, 'Failed to save episode.'); }
}

/**
 * Saves multiple episodes in a single database batch insert, automatically updating the series totalEpisodes count.
 */
export async function saveBulkEpisodesAction(seriesId: string, episodesData: { episodeInSeason: number; videoSources: { quality: string; url: string; }[] }[]) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    try {
        if (!seriesId || !Array.isArray(episodesData) || episodesData.length === 0) {
            return { success: false, error: 'No episodes data provided.' };
        }

        const docsToInsert = episodesData.map((ep: any) => ({
            seriesId,
            episodeInSeason: Number(ep.episodeInSeason),
            videoSources: ep.videoSources || [],
            subtitles: ep.subtitles || [],
            createdAt: new Date()
        }));

        if (docsToInsert.length > 0) {
            await db.collection('episodes').insertMany(docsToInsert);
        }

        // Auto-update totalEpisodes count in series
        const totalCount = await db.collection('episodes').countDocuments({ seriesId });
        await db.collection('series').updateOne(getQueryById(seriesId), {
            $set: { totalEpisodes: totalCount }
        });

        revalidatePath(`/admin/series/${seriesId}/episodes`);
        return { success: true, count: docsToInsert.length };
    } catch (e: any) {
        return handleError('saveBulkEpisodesAction', e, 'Failed to save bulk episodes.');
    }
}

/**
 * Deletes an episode along with its video files.
 */
export async function deleteEpisodeAction(id: string, seriesId: string) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    try {
        const episode = await db.collection('episodes').findOne(getQueryById(id));
        if (episode) {
            if (episode.videoSources && Array.isArray(episode.videoSources)) {
                for (const src of episode.videoSources) {
                    if (src.url) await deleteFile(src.url);
                }
            }
            if (episode.videoUrl) {
                await deleteFile(episode.videoUrl);
            }
            if (episode.subtitles && Array.isArray(episode.subtitles)) {
                for (const sub of episode.subtitles) {
                    if (sub.url) await deleteFile(sub.url);
                }
            }
        }
        await db.collection('episodes').deleteOne(getQueryById(id));
        revalidatePath(`/admin/series/${seriesId}/episodes`);
        return { success: true };
    } catch (e: any) { return handleError('deleteEpisodeAction', e, 'Failed to delete episode.'); }
}

/**
 * Unlocks a locked episode by exchanging coins or watching AdMob ads.
 */
export async function unlockEpisodeAction(payload: any) {
    const db = await getDb();
    try {
        const { userId, episodeId, method, cost, seriesTitle, episodeNumber } = payload;
        const alreadyUnlocked = await db.collection('unlocked-episodes').findOne({ userId, episodeId });
        if (alreadyUnlocked) return { success: true };
        if (method === 'coins') {
            const updateResult = await db.collection('users').updateOne({ _id: userId as any, coins: { $gte: cost } }, { $inc: { coins: -cost } });
            if (updateResult.modifiedCount === 0) return { success: false, error: 'Insufficient coins' };
            db.collection('coin-transactions').insertOne({ userId, type: 'spend', amount: -cost, description: `Unlocked: ${seriesTitle} - Ep ${episodeNumber}`, createdAt: new Date() });
        } else {
            const today = new Date().toISOString().split('T')[0];
            db.collection('ad-watches').updateOne({ userId, date: today }, { $inc: { count: 1 }, $set: { userId, date: today } }, { upsert: true });
        }
        await db.collection('unlocked-episodes').updateOne({ userId, episodeId }, { $set: { ...payload, unlockedAt: new Date() } }, { upsert: true });
        return { success: true };
    } catch (e: any) { return handleError('unlockEpisodeAction', e, 'Failed to unlock episode.'); }
}

/**
 * Generates an encrypted video URL utilizing AES-256-CBC token rotation.
 */
export async function getSecureVideoUrl(filePath: string): Promise<string> {
    if (!filePath || (!filePath.startsWith('/uploads/') && !filePath.startsWith('http://') && !filePath.startsWith('https://'))) {
        return filePath;
    }

    // BYPASS PROXY FOR NATIVE HLS (.m3u8) AND DASH (.mpd) STREAMS
    // Native HLS and DASH rely on relative chunk streams which break if proxied.
    const lowerPath = filePath.toLowerCase();
    if (lowerPath.endsWith('.m3u8') || lowerPath.endsWith('.mpd') || lowerPath.endsWith('.m4s')) {
        return filePath;
    }

    const settings = await getPluginsSettings() as ServerPluginsSettings | null;
    const period = settings?.videoRotationPeriod || '24h';
    const secret = await getVideoSecret();
    let timeKey = ''; const now = Date.now();
    switch(period) {
        case '1h': timeKey = String(Math.floor(now / 3600000)); break;
        case '12h': timeKey = String(Math.floor(now / 43200000)); break;
        case '24h': timeKey = new Date().toISOString().split('T')[0]; break;
        case '1w': timeKey = String(Math.floor(now / 604800000)); break;
        case '1mo': timeKey = `${new Date().getFullYear()}-${new Date().getMonth()}`; break;
        default: timeKey = new Date().toISOString().split('T')[0];
    }
    const payload = `${filePath}|${timeKey}`;
    const encryptedKey = encryptPath(payload, secret);
    
    if (lowerPath.endsWith('.ts')) {
        return `/api/hls?v=${encodeURIComponent(encryptedKey)}&ext=.m3u8`;
    }
    
    return `/api/video?v=${encodeURIComponent(encryptedKey)}`;
}

/**
 * Submits user report feedback.
 */
export async function submitReportAction(payload: { reporterUid: string, reporterEmail: string | null, reportedContentRef: string, reportedContentTitle: string, seriesId: string, reason: string }) {
    try { const db = await getDb(); await db.collection('reports').insertOne({ ...payload, createdAt: new Date(), status: 'open' }); revalidatePath('/admin/reports'); return { success: true }; }
    catch (e: any) { return handleError('submitReportAction', e, 'Failed to submit report.'); }
}

/**
 * Revalidates Next.js layout caches.
 */
export async function revalidateAllAction() { revalidatePath('/', 'layout'); return { success: true }; }

/**
 * Saves monetization options settings.
 */
export async function saveMonetizationSettingsAction(data: any) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    await db.collection('settings').updateOne({ _id: 'monetization' as any }, { $set: data }, { upsert: true });
    return { success: true };
}

/**
 * Deletes coin packs.
 */
export async function deleteCoinPackAction(id: string) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    await db.collection('coin-packs').deleteOne(getQueryById(id));
    return { success: true };
}

/**
 * Saves coin packs.
 */
export async function saveCoinPackAction(pack: any) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb(); const { id, ...data } = pack;
    if (id) await db.collection('coin-packs').updateOne(getQueryById(id), { $set: data });
    else await db.collection('coin-packs').insertOne(data);
    return { success: true };
}

/**
 * Saves mobile AdMob ad settings.
 */
export async function saveAdSettingsAction(data: any) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    const { id, ...rest } = data;
    await db.collection('ads').updateOne({ _id: id as any }, { $set: rest }, { upsert: true });
    return { success: true };
}

/**
 * Marks messages as read.
 */
export async function markContactAsReadAction(id: string) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    await db.collection('contacts').updateOne(getQueryById(id), { $set: { isRead: true } });
    return { success: true };
}

/**
 * Deletes contact messages.
 */
export async function deleteContactAction(id: string) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    try { await db.collection('contacts').deleteOne(getQueryById(id)); return { success: true }; } catch (e) { return { success: false, error: 'Delete failed' }; }
}

/**
 * Updates user report statuses.
 */
export async function updateReportStatusAction(id: string, status: string) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    await db.collection('reports').updateOne(getQueryById(id), { $set: { status } });
    return { success: true };
}

/**
 * Deletes user reports.
 */
export async function deleteReportAction(id: string) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    await db.collection('reports').deleteOne(getQueryById(id));
    return { success: true };
}

/**
 * Saves reward task items.
 */
export async function saveRewardTaskAction(data: any) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb(); const { id, ...rest } = data; rest.platform = rest.platform || 'website'; if (rest.type === 'ad') { delete rest.url; if (rest.platform === 'android') { delete rest.adScript; rest.timerSeconds = 0; } } else if (rest.type === 'link') { delete rest.adScript; } if (id) await db.collection('reward-tasks').updateOne(getQueryById(id), { $set: rest }); else await db.collection('reward-tasks').insertOne(rest); revalidatePath('/admin/rewards'); return { success: true };
}

/**
 * Deletes reward task items.
 */
export async function deleteRewardTaskAction(id: string) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb(); try { await db.collection('reward-tasks').deleteOne(getQueryById(id)); revalidatePath('/admin/rewards'); return { success: true }; } catch(e) { return { success: false, error: 'Delete failed' }; }
}

/**
 * Saves reward settings options.
 */
export async function saveRewardSettingsAction(data: any) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb(); await db.collection('settings').updateOne({ _id: 'rewards' as any }, { $set: data }, { upsert: true }); revalidatePath('/', 'layout'); return { success: true };
}

/**
 * Tests connection to MongoDB database.
 */
export async function testMongoDbConnectionAction() { try { const db = await getDb(); await db.command({ ping: 1 }); return { success: true, message: 'Connected successfully to MongoDB!' }; } catch (e: any) { return handleError('testMongoDbConnectionAction', e, 'Database connection test failed.'); } }

/**
 * Exports MongoDB collections to JSON backups.
 */
export async function exportMongoDataAction() {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };
 try { const db = await getDb(); const collections = await db.listCollections().toArray(); const backup: any = {}; for (const col of collections) { if (col.name.startsWith('system.')) continue; backup[col.name] = await db.collection(col.name).find({}).toArray(); } return { success: true, data: JSON.stringify(backup, null, 2) }; } catch (e: any) { return handleError('exportMongoDataAction', e, 'Database export failed.'); } }

/**
 * Imports collections from JSON database backups.
 */
export async function importDataToMongoAction(jsonContent: string) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    try { const data = JSON.parse(jsonContent); const db = await getDb(); if (typeof data !== 'object' || data === null) throw new Error('Invalid backup file format.');
        for (const collectionName in data) { if (collectionName.startsWith('system.')) continue; const documents = data[collectionName];
            if (Array.isArray(documents)) { await db.collection(collectionName).deleteMany({}); if (documents.length > 0) { const preparedDocs = documents.map((doc: any) => { const newDoc = { ...doc }; if (newDoc._id && typeof newDoc._id === 'string' && ObjectId.isValid(newDoc._id)) { if (newDoc._id.length === 24) newDoc._id = new ObjectId(newDoc._id); } for (const key in newDoc) { if (typeof newDoc[key] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(newDoc[key])) newDoc[key] = new Date(newDoc[key]); } return newDoc; }); await db.collection(collectionName).insertMany(preparedDocs); } } }
        revalidatePath('/', 'layout'); return { success: true, message: 'Database restored successfully from backup.' };
    } catch (e: any) { return handleError('importDataToMongoAction', e, 'Database import failed.'); }
}

/**
 * Performs database table installations.
 */
export async function installInitializeDbAction() {
    try {
        const db = await getDb();
        const categories = [
            { name: 'Romance', slug: 'romance', showOnHomepage: true },
            { name: 'Action', slug: 'action', showOnHomepage: true },
            { name: 'CEO', slug: 'ceo', showOnHomepage: true },
            { name: 'Revenge', slug: 'revenge', showOnHomepage: true },
        ];

        await getVideoSecret();
        await db.collection('categories').deleteMany({});
        await db.collection('categories').insertMany(categories);
        await db.collection('languages').deleteMany({});
        await db.collection('languages').insertOne({ name: 'English', languageCode: 'en', countryCode: 'US' });
        await db.collection('settings').updateOne(
            { _id: 'general' as any },
            { $set: { siteName: 'SnapReels', defaultLanguageCode: 'en', showCopyright: true, showVersion: true, seriesUrlFormat: 'hash' } },
            { upsert: true }
        );
        await db.collection('settings').updateOne(
            { _id: 'monetization' as any },
            { $set: { episodeCost: 50, isCoinsActive: true, currency: 'USD', currencySymbol: '$' } },
            { upsert: true }
        );
        await db.collection('settings').updateOne(
            { _id: 'rewards' as any },
            { $set: { isEnabled: true, dailyRewards: [10, 20, 30, 40, 50, 60, 70] } },
            { upsert: true }
        );
        await db.collection('ads').updateOne(
            { _id: 'video_player_ad' as any },
            { $set: { title: 'Video Player Unlock Ad', type: 'video', scriptContent: '', isActive: true, skipTimerSeconds: 15, dailyWatchLimit: 5 } },
            { upsert: true }
        );
        return { success: true };
    } catch (e: any) {
        return handleError('installInitializeDbAction', e, 'Database initialization failed.');
    }
}

/**
 * Saves initial website branding details during the installation wizard.
 */
export async function installSaveSiteConfigAction(data: { siteName: string; siteUrl: string }) {
    try {
        const db = await getDb();
        const existingAdmin = await db.collection('settings').findOne({ _id: 'admin' as any });
        if (existingAdmin) {
            const isAuth = await import('./auth').then(m => m.verifyAdminSession());
            if (!isAuth) {
                return { success: false, error: 'Unauthorized access.' };
            }
        }

        const siteName = (data.siteName || 'SnapReels').trim();
        let siteUrl = (data.siteUrl || '').trim();
        if (siteUrl.endsWith('/')) {
            siteUrl = siteUrl.slice(0, -1);
        }

        await db.collection('settings').updateOne(
            { _id: 'general' as any },
            { 
                $set: { 
                    siteName, 
                    siteUrl,
                    updatedAt: new Date().toISOString()
                } 
            },
            { upsert: true }
        );
        return { success: true };
    } catch (e: any) {
        return handleError('installSaveSiteConfigAction', e, 'Failed to save website details.');
    }
}

/**
 * Increments series views statistics.
 */
export async function incrementSeriesViewAction(seriesId: string) { const db = await getDb(); try { await db.collection('series').updateOne(getQueryById(seriesId), { $inc: { views: 1 } }); return { success: true }; } catch (e) { return { success: false }; } }

/**
 * Dispatches Push Notifications.
 */
export async function sendNotificationAction(payload: { target: 'all' | 'specific', userId?: string, title: string, message: string }) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    try { const plugins = await getPluginsSettings() as ServerPluginsSettings | null; if (!plugins?.oneSignalAppId || !plugins?.oneSignalApiKey) throw new Error('OneSignal not configured.');
        const body: any = { app_id: plugins.oneSignalAppId, headings: { en: payload.title }, contents: { en: payload.message } };
        if (payload.target === 'all') body.included_segments = ['Total Subscriptions']; else body.include_external_user_ids = [payload.userId];
        const response = await fetch('https://onesignal.com/api/v1/notifications', { method: 'POST', headers: { 'Authorization': `Basic ${plugins.oneSignalApiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await response.json(); if (!response.ok) throw new Error(data.errors?.[0] || 'OneSignal API Error');
        const db = await getDb(); await db.collection('notifications').insertOne({ ...payload, sentAt: new Date(), status: 'sent', oneSignalId: data.id });
        return { success: true, message: `Broadcast successful.` };
    } catch (e: any) { return handleError('sendNotificationAction', e, 'Failed to send notification.'); }
}

/**
 * Tests OneSignal key connections.
 */
export async function testOneSignalAction(appId: string, apiKey: string) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    try { const response = await fetch(`https://onesignal.com/api/v1/apps/${appId.trim()}`, { method: 'GET', headers: { 'Authorization': `Basic ${apiKey.trim()}` } });
        const data = await response.json(); if (response.ok) return { success: true, message: `Connected to ${data.name}` }; return { success: false, error: 'Auth failed' };
    } catch (e) { return { success: false, error: 'Network error' }; }
}

/**
 * Saves storage configurations.
 */
export async function saveStorageSettingsAction(data: any) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb(); await db.collection('settings').updateOne({ _id: 'storage' as any }, { $set: data }, { upsert: true }); revalidatePath('/admin/settings/storage'); return { success: true };
}

/**
 * Tests storage bucket authentication.
 */
export async function testStorageConnectionAction(provider: string, config: any) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    try { 
        if (provider === 'local') return { success: true, message: 'Local active.' };
        
        if (provider === 'bunny') {
            const storageZoneName = config.storageZoneName;
            const apiKey = config.apiKey;
            const region = config.region || '';
            let host = 'storage.bunnycdn.com';
            if (region && region.toLowerCase() !== 'de') {
                host = `${region.toLowerCase()}.storage.bunnycdn.com`;
            }
            const url = `https://${host}/${storageZoneName}/test.txt`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'AccessKey': apiKey,
                    'Content-Type': 'application/octet-stream',
                },
                body: 'test'
            });
            if (response.ok) {
                return { success: true, message: 'Connected to BUNNY.NET' };
            } else {
                const errMsg = await response.text();
                return { success: false, error: `Bunny.net connection test failed: ${response.statusText} (${errMsg})` };
            }
        }

        let clientConfig: any = { credentials: { accessKeyId: config.accessKeyId || config.applicationKeyId, secretAccessKey: config.secretAccessKey || config.applicationKey }, region: config.region || 'us-east-1' };
        if (provider === 'gcs') { clientConfig.endpoint = 'https://storage.googleapis.com'; clientConfig.forcePathStyle = true; clientConfig.region = 'auto'; }
        else if (config.endpoint) { clientConfig.endpoint = config.endpoint.startsWith('http') ? config.endpoint : `https://${config.endpoint}`; clientConfig.forcePathStyle = true; }
        const s3 = new S3Client(clientConfig); await s3.send(new PutObjectCommand({ Bucket: config.bucket, Key: 'test.txt', Body: 'test', ContentType: 'text/plain' }));
        return { success: true, message: `Connected to ${provider.toUpperCase()}` };
    } catch (e: any) { return handleError('testStorageConnectionAction', e, 'Storage connection test failed.'); }
}

/**
 * Saves custom translations.
 */
export async function saveLanguageTranslationsAction(langCode: string, translations: Record<string, string>) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb(); try { await db.collection('translations').updateOne({ _id: langCode as any }, { $set: translations }, { upsert: true }); revalidatePath('/', 'layout'); return { success: true }; } catch (e: any) { return handleError('saveLanguageTranslationsAction', e, 'Failed to save translations.'); }
}

/**
 * Saves mobile configurations settings.
 */
export async function saveMobileSettingsAction(settings: any) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    try {
        const data = typeof settings === 'string' ? { apiKey: settings } : settings;
        await db.collection('settings').updateOne(
            { _id: 'mobile' as any },
            { $set: { ...data, versionCode: Number(data.versionCode || 1), updatedAt: new Date() } },
            { upsert: true }
        );
        
        // Also update video_player_ad dailyWatchLimit if admobRewardedLimit is provided
        if (data.admobRewardedLimit !== undefined) {
            const limitVal = Number(data.admobRewardedLimit ?? 5);
            await db.collection('ads').updateOne(
                { _id: 'video_player_ad' as any },
                { $set: { dailyWatchLimit: limitVal } },
                { upsert: true }
            );
        }
        
        revalidatePath('/admin/settings/mobile');
        return { success: true };
    } catch (e: any) {
        return handleError('saveMobileSettingsAction', e, 'Failed to save mobile settings.');
    }
}

/**
 * Dynamically generates a secure Mobile API key.
 */
export async function generateMobileApiKeyAction() {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    try {
        const key = 'snap_apk_' + randomBytes(24).toString('hex');
        return { success: true, apiKey: key };
    } catch (e: any) {
        return handleError('generateMobileApiKeyAction', e, 'Failed to generate API key.');
    }
}

