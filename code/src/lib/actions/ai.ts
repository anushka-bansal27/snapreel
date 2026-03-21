'use server';

import { getPluginsSettings } from '../data.actions';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { handleError } from './utils';
import { ServerPluginsSettings } from '../server-types';

export async function callAi(prompt: string, jsonMode: boolean = false) {
    const settings = await getPluginsSettings() as ServerPluginsSettings | null;
    const provider = settings?.aiProvider || 'groq';

    if (provider === 'groq') {
        const apiKey = settings?.groqApiKey?.trim();
        if (!apiKey) throw new Error('Groq API Key not configured.');
        const groq = new Groq({ apiKey });
        
        // Priority list of preferred models across Groq clusters/regions (Qwen models are top for multilingual & high TPM)
        const preferredModels = [
            'qwen/qwen3.8-27b',
            'qwen/qwen3.6-27b',
            'llama-3.3-70b-versatile',
            'llama-3.1-8b-instant',
            'openai/gpt-oss-120b',
            'openai/gpt-oss-20b',
            'groq/compound-mini',
            'allam-2-7b'
        ];

        let candidateModels = preferredModels;
        try {
            const list = await groq.models.list();
            const availableIds = (list?.data || []).map((m: any) => m.id);
            const filtered = preferredModels.filter(m => availableIds.includes(m));
            if (filtered.length > 0) {
                candidateModels = filtered;
            } else {
                const anyChat = availableIds.find((id: string) => 
                    !id.includes('whisper') && !id.includes('guard') && !id.includes('embed') && !id.includes('tts')
                );
                if (anyChat) candidateModels = [anyChat];
            }
        } catch (e) {
            // fallback to preferredModels
        }

        let lastError: any = null;
        for (const model of candidateModels) {
            try {
                const res = await groq.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model,
                    response_format: jsonMode ? { type: 'json_object' } : undefined,
                    temperature: 0.1,
                    max_completion_tokens: 8192,
                });
                const content = res.choices[0].message.content || '';
                if (jsonMode) return content.replace(/```json/g, '').replace(/```/g, '').trim();
                return content;
            } catch (err: any) {
                lastError = err;
                const errStr = (err?.error?.error?.message || err?.error?.message || err?.message || '').toLowerCase();
                if (
                    errStr.includes('does not exist') || 
                    errStr.includes('not have access') || 
                    errStr.includes('model_not_found') || 
                    errStr.includes('decommissioned') ||
                    errStr.includes('rate_limit') ||
                    errStr.includes('tokens per minute') ||
                    errStr.includes('json_validate_failed') ||
                    errStr.includes('request too large')
                ) {
                    continue;
                }
                throw err;
            }
        }
        throw lastError || new Error('Groq generation failed.');
    }

    if (provider === 'openai') {
        const apiKey = settings?.openaiApiKey?.trim();
        if (!apiKey) throw new Error('OpenAI API Key not configured.');
        const openai = new OpenAI({ apiKey });
        
        // Models ordered by preference with fallback
        const models = ['gpt-4o-mini', 'gpt-4o', 'o3-mini'];
        let lastError: any = null;

        for (const model of models) {
            try {
                const res = await openai.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model,
                    response_format: jsonMode ? { type: 'json_object' } : undefined,
                    temperature: model.startsWith('o3') ? undefined : 0.1,
                    max_completion_tokens: 8192,
                });
                const content = res.choices[0].message.content || '';
                if (jsonMode) return content.replace(/```json/g, '').replace(/```/g, '').trim();
                return content;
            } catch (err: any) {
                lastError = err;
                const errStr = (err?.error?.message || err?.message || '').toLowerCase();
                if (errStr.includes('does not exist') || errStr.includes('model_not_found') || errStr.includes('not have access')) {
                    continue;
                }
                throw err;
            }
        }
        throw lastError || new Error('OpenAI generation failed.');
    }

    if (provider === 'gemini') {
        const apiKey = settings?.geminiApiKey?.trim();
        if (!apiKey) throw new Error('Gemini API Key not configured.');
        const gemini = new GoogleGenerativeAI(apiKey);
        
        // Supported 2026 Gemini models with auto-failover
        const models = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'];
        let lastError: any = null;

        for (const modelName of models) {
            try {
                const model = gemini.getGenerativeModel({
                    model: modelName,
                    generationConfig: jsonMode
                        ? { temperature: 0.1, responseMimeType: 'application/json', maxOutputTokens: 8192 }
                        : { temperature: 0.1, maxOutputTokens: 8192 },
                });
                const result = await model.generateContent(prompt);
                const content = result.response.text() || '';
                if (jsonMode) return content.replace(/```json/g, '').replace(/```/g, '').trim();
                return content;
            } catch (err: any) {
                lastError = err;
                const errStr = (err?.message || '').toLowerCase();
                if (
                    errStr.includes('not found') || 
                    errStr.includes('404') ||
                    errStr.includes('503') ||
                    errStr.includes('unavailable') ||
                    errStr.includes('high demand') ||
                    errStr.includes('resource_exhausted') ||
                    errStr.includes('429')
                ) {
                    continue;
                }
                throw err;
            }
        }
        throw lastError || new Error('Gemini generation failed.');
    }

    throw new Error('Unsupported AI Provider.');
}

/**
 * Generates structured Series metadata (titles, descriptions, tags, genres) from seed texts.
 */
export async function generateFullSeriesMetadataAction(seedText: string) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };
    try {
        const systemPrompt = `You are a professional film producer. Generate drama series metadata based on the description provided.
        Result MUST be a JSON object with: title, description, genres[], tags[], seoTitle, metaDescription, metaKeywords[], slug.
        Input story: "${seedText}"`;
        
        const content = await callAi(systemPrompt, true);
        if (!content) throw new Error('AI returned no content.');
        return { success: true, data: JSON.parse(content) };
    } catch (e: any) {
        return handleError('generateFullSeriesMetadataAction', e, 'AI Generation failed.');
    }
}

/**
 * Verifies the validity of the Groq API key.
 */
export async function testGroqKeyAction(apiKey: string) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };
    try {
        const groq = new Groq({ apiKey });
        
        // First verify authentication and fetch available models directly from Groq
        const modelsList = await groq.models.list();
        const availableModelIds: string[] = (modelsList?.data || []).map((m: any) => m.id);
        console.log('[Groq] Verified API Key. Available models on this account:', availableModelIds);

        // Preference order for chat/completions (NO decommissioned models)
        const preferredModels = [
            'qwen/qwen3.8-27b',
            'qwen/qwen3.6-27b',
            'llama-3.3-70b-versatile',
            'llama-3.1-8b-instant',
            'openai/gpt-oss-120b',
            'openai/gpt-oss-20b',
            'groq/compound-mini',
            'allam-2-7b'
        ];

        // Find candidate models that actually exist in the account's active model list
        const candidates = preferredModels.filter(m => availableModelIds.includes(m));
        if (candidates.length === 0) {
            // Pick any chat model that isn't whisper/guard/embedding
            const genericChat = availableModelIds.find(id => 
                !id.includes('whisper') && !id.includes('guard') && !id.includes('embed') && !id.includes('tts')
            );
            if (genericChat) candidates.push(genericChat);
        }

        let lastError: any = null;
        for (const model of candidates) {
            try {
                console.log(`[Groq] Testing completion with model: ${model}`);
                await groq.chat.completions.create({
                    messages: [{ role: 'user', content: 'test' }],
                    model,
                    max_tokens: 1
                });
                return { success: true, message: `Groq API Key is valid! Connected via ${model}.` };
            } catch (err: any) {
                console.error(`[Groq] Model ${model} test failed:`, err?.message || err);
                lastError = err;
            }
        }

        if (availableModelIds.length > 0) {
            // Key is valid since models.list succeeded, even if completion rate limit was reached
            return { 
                success: true, 
                message: `Groq API Key is valid! (${availableModelIds.length} models accessible).` 
            };
        }

        const msg = lastError?.error?.message || lastError?.message || 'Groq API Key verification failed.';
        return handleError('testGroqKeyAction', lastError, msg);
    } catch (e: any) {
        const msg = e?.error?.message || e?.message || 'Invalid Groq API Key.';
        return handleError('testGroqKeyAction', e, msg);
    }
}

/**
 * Verifies the validity of the OpenAI API key.
 */
export async function testOpenAiKeyAction(apiKey: string) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };
    try {
        const openai = new OpenAI({ apiKey });
        const models = ['gpt-4o-mini', 'gpt-4o', 'o3-mini'];
        let lastError: any = null;

        for (const model of models) {
            try {
                await openai.chat.completions.create({
                    messages: [{ role: 'user', content: 'test' }],
                    model,
                    max_tokens: 1
                });
                return { success: true, message: `OpenAI API Key is valid! Connected via ${model}.` };
            } catch (err: any) {
                lastError = err;
                const errStr = (err?.error?.message || err?.message || '').toLowerCase();
                if (errStr.includes('does not exist') || errStr.includes('model_not_found') || errStr.includes('not have access')) {
                    continue;
                }
                break;
            }
        }
        const msg = lastError?.error?.message || lastError?.message || 'OpenAI API Key verification failed.';
        return handleError('testOpenAiKeyAction', lastError, msg);
    } catch (e: any) {
        const msg = e?.error?.message || e?.message || 'OpenAI API Key verification failed.';
        return handleError('testOpenAiKeyAction', e, msg);
    }
}

/**
 * Verifies the Gemini key against the configured production model.
 */
export async function testGeminiKeyAction(apiKey: string) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };
    try {
        const gemini = new GoogleGenerativeAI(apiKey);
        const models = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'];
        let lastError: any = null;

        for (const modelName of models) {
            try {
                const model = gemini.getGenerativeModel({ model: modelName });
                await model.generateContent('Reply with OK.');
                return { success: true, message: `Gemini API Key is valid! Connected via ${modelName}.` };
            } catch (err: any) {
                lastError = err;
                const errStr = (err?.message || '').toLowerCase();
                if (errStr.includes('not found') || errStr.includes('404') || errStr.includes('503') || errStr.includes('high demand') || errStr.includes('429')) {
                    continue;
                }
                break;
            }
        }
        const msg = lastError?.message || 'Gemini API Key verification failed.';
        return handleError('testGeminiKeyAction', lastError, msg);
    } catch (e: any) {
        const msg = e?.message || 'Gemini API Key verification failed.';
        return handleError('testGeminiKeyAction', e, msg);
    }
}
