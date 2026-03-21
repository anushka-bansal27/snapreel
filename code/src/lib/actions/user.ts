'use server';

import { getDb } from '../mongodb';
import { revalidatePath } from 'next/cache';
import { handleError, getQueryById } from './utils';
import { getDemoModeMutationError } from '../demo-mode';
import { deleteFile } from '../storage-utils';
import { randomBytes } from 'crypto';
import { hashPassword } from '../crypto';

/**
 * Toggles a user's banned or disabled status in the platform.
 */
export async function updateUserStatusAction(userId: string, disabled: boolean) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    try {
        await db.collection('users').updateOne({ _id: userId as any }, { $set: { disabled } });
        revalidatePath('/admin/users');
        return { success: true };
    } catch (e: any) { return handleError('updateUserStatusAction', e, 'Failed to update user status.'); }
}

/**
 * Updates user profile information from the admin interface.
 */
export async function adminUpdateUserAction(userId: string, data: any) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    try {
        const { password } = data;

        // Fetch current user to verify identity and check for profile image changes
        const currentUser = await db.collection('users').findOne({ _id: userId as any });
        if (currentUser && currentUser.photoURL && data.photoURL && currentUser.photoURL !== data.photoURL) {
            await deleteFile(currentUser.photoURL);
        }

        // Explicitly allowlist and typecast fields to prevent arbitrary MongoDB payload injections
        const updateData: any = {};
        if (data.displayName !== undefined) updateData.displayName = typeof data.displayName === 'string' ? data.displayName : null;
        if (data.email !== undefined) updateData.email = typeof data.email === 'string' ? data.email : null;
        if (data.phoneNumber !== undefined) updateData.phoneNumber = typeof data.phoneNumber === 'string' ? data.phoneNumber : null;
        if (data.photoURL !== undefined) updateData.photoURL = typeof data.photoURL === 'string' ? data.photoURL : null;
        if (data.coins !== undefined) updateData.coins = Number(data.coins) || 0;
        if (data.isVip !== undefined) updateData.isVip = Boolean(data.isVip);
        if (data.vipExpiry !== undefined) {
            updateData.vipExpiry = data.vipExpiry ? (typeof data.vipExpiry === 'string' ? data.vipExpiry : new Date(data.vipExpiry)) : null;
        }
        if (data.disabled !== undefined) updateData.disabled = Boolean(data.disabled);

        if (password) {
            const salt = randomBytes(16).toString('hex');
            const hash = hashPassword(password, salt);
            updateData.passwordHash = hash;
            updateData.passwordSalt = salt;
        }

        await db.collection('users').updateOne({ _id: userId as any }, { $set: updateData });
        revalidatePath('/admin/users');
        return { success: true };
    } catch (e: any) { return handleError('adminUpdateUserAction', e, 'Failed to update user.'); }
}

/**
 * Permanently deletes a user profile and all associated logs/data.
 */
export async function deleteUserAction(userId: string) {
    if (!(await import('./auth').then(m => m.verifyAdminSession()))) return { success: false, error: 'Unauthorized access.' };

    const demoError = getDemoModeMutationError();
    if (demoError) return demoError;
    const db = await getDb();
    try {
        const user = await db.collection('users').findOne({ _id: userId as any });
        if (user?.photoURL) {
            await deleteFile(user.photoURL);
        }

        await db.collection('users').deleteOne({ _id: userId as any });
        await db.collection('favorites').deleteMany({ userId });
        await db.collection('history').deleteMany({ userId });
        await db.collection('unlocked-episodes').deleteMany({ userId });
        await db.collection('reward-claims').deleteMany({ userId });
        await db.collection('coin-transactions').deleteMany({ userId });
        
        revalidatePath('/admin/users');
        return { success: true };
    } catch (e: any) { return handleError('deleteUserAction', e, 'Failed to delete user.'); }
}

/**
 * Toggles a series in the user's bookmarks/favorites list.
 */
export async function toggleFavoriteAction(userId: string, seriesId: string) {
    const db = await getDb();
    try {
        const existing = await db.collection('favorites').findOne({ userId, seriesId });
        if (existing) {
            await db.collection('favorites').deleteOne({ userId, seriesId });
            return { success: true, action: 'removed' };
        } else {
            await db.collection('favorites').insertOne({ userId, seriesId, favoritedAt: new Date() });
            return { success: true, action: 'added' };
        }
    } catch (e: any) { return handleError('toggleFavoriteAction', e, 'Failed to toggle favorite.'); }
}

/**
 * Adds or updates user's series playback progress watch history.
 */
export async function updateHistoryAction(payload: { userId: string; seriesId: string; episodeId: string; episodeInSeason: number; progress: number }) {
    const db = await getDb();
    try {
        const { userId, seriesId, ...data } = payload;
        await db.collection('history').updateOne({ userId, seriesId }, { $set: { ...data, watchedAt: new Date() } }, { upsert: true });
        return { success: true };
    } catch (e: any) { return handleError('updateHistoryAction', e, 'Failed to update watch history.'); }
}

/**
 * Removes a single series entry from the user's watch history.
 */
export async function removeHistoryItemAction(userId: string, seriesId: string) {
    const db = await getDb();
    try {
        await db.collection('history').deleteOne({ userId, seriesId });
        return { success: true };
    } catch (e: any) { return handleError('removeHistoryItemAction', e, 'Failed to remove watch history item.'); }
}

/**
 * Clears the user's entire watch history.
 */
export async function clearHistoryAction(userId: string) {
    const db = await getDb();
    try {
        await db.collection('history').deleteMany({ userId });
        return { success: true };
    } catch (e: any) { return handleError('clearHistoryAction', e, 'Failed to clear watch history.'); }
}

/**
 * Processes claiming rewards for tasks (e.g. daily check-ins, app install link views).
 */
export async function claimRewardAction(userId: string, taskId: string, platform: 'website' | 'android' = 'website') {
    const db = await getDb();
    try {
        // Step 1: Retrieve the specified reward task from the database
        const task = await db.collection('reward-tasks').findOne(getQueryById(taskId));
        if (!task) return { success: false, error: 'Task not found' };

        // Step 2: Validate that the client platform matches the target platform for this task
        const taskPlatform = task.platform || 'website';
        if (taskPlatform !== platform) return { success: false, error: 'Reward task is not available on this platform' };

        // Step 3: Compute the start boundary of the current calendar day to verify frequency constraints
        const todayStart = new Date(); 
        todayStart.setHours(0, 0, 0, 0);

        // Step 4: Construct the verification query based on frequency rules
        // For 'once' tasks, we search for any claim historical entry.
        // For 'daily' tasks, we verify if a claim was already registered starting today.
        const claimQuery = task.frequency === 'once'
            ? { userId, taskId }
            : { userId, taskId, claimedAt: { $gte: todayStart } };

        const existing = await db.collection('reward-claims').findOne(claimQuery);
        if (existing) {
            return { 
                success: false, 
                error: task.frequency === 'once' ? 'Already claimed' : 'Already claimed today' 
            };
        }

        // Step 5: Securely increment the user's coin balance by the specified reward amount
        await db.collection('users').updateOne({ _id: userId as any }, { $inc: { coins: task.coins } });

        // Step 6: Log the claim entry to enforce frequency checks on subsequent calls
        await db.collection('reward-claims').insertOne({ userId, taskId, platform, claimedAt: new Date() });

        // Step 7: Record the transaction history for auditing coin modifications
        await db.collection('coin-transactions').insertOne({ 
            userId, 
            type: 'purchase', 
            amount: task.coins, 
            description: `Reward: ${task.title}`, 
            createdAt: new Date() 
        });

        revalidatePath('/', 'layout');
        return { success: true };
    } catch (e: any) { return handleError('claimRewardAction', e, 'Failed to claim reward.'); }
}

/**
 * Processes daily login check-in and increments coin balances.
 */
export async function performDailyCheckInAction(userId: string) {
    const db = await getDb();
    try {
        // Step 1: Resolve the user profile from the database
        const user = await db.collection('users').findOne({ _id: userId as any });
        if (!user) return { success: false, error: 'User not found' };

        // Step 2: Enforce a strict frequency check (exactly one login check-in per day using YYYY-MM-DD format)
        const today = new Date().toISOString().split('T')[0];
        if (user.lastCheckInDate === today) return { success: false, error: 'Already checked in today' };

        // Step 3: Fetch reward configurations from global settings or fall back to default values
        const settings = await db.collection('settings').findOne({ _id: 'rewards' as any });
        const dailyRewards = settings?.dailyRewards || [10, 20, 30, 40, 50, 60, 70];

        // Step 4: Calculate the check-in streak progression
        const lastCheckIn = user.lastCheckInDate;
        const yesterday = new Date(); 
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let dayNum = 1; 
        // If the user's last check-in was yesterday, advance their streak count, wrapping around on day 7
        if (lastCheckIn === yesterdayStr) {
            dayNum = ((user.consecutiveCheckInDays || 0) % 7) + 1;
        }

        // Step 5: Resolve the reward coins count for the current day of the streak
        const reward = dailyRewards[dayNum - 1];

        // Step 6: Credit the user's coins balance and save the new check-in date/streak count in database
        await db.collection('users').updateOne(
            { _id: userId as any }, 
            { 
                $inc: { coins: reward }, 
                $set: { lastCheckInDate: today, consecutiveCheckInDays: dayNum } 
            }
        );

        // Step 7: Record coin transaction history for audit trail
        await db.collection('coin-transactions').insertOne({ 
            userId, 
            type: 'purchase', 
            amount: reward, 
            description: `Daily Check-in: Day ${dayNum}`, 
            createdAt: new Date() 
        });

        revalidatePath('/', 'layout');
        return { success: true, reward, dayNum };
    } catch (e: any) { return handleError('performDailyCheckInAction', e, 'Failed to perform daily check-in.'); }
}

/**
 * Toggles user likes status on a series (increments database count).
 */
export async function toggleLikeSeriesAction(seriesId: string, userId: string): Promise<{ success: boolean; liked: boolean; likes: number }> {
    const db = await getDb();
    try {
        const likesColl = db.collection('series_likes');
        const existing = await likesColl.findOne({ seriesId, userId });

        if (existing) {
            // Unlike: remove record and decrement
            await likesColl.deleteOne({ seriesId, userId });
            const result = await db.collection('series').findOneAndUpdate(
                getQueryById(seriesId),
                { $inc: { likes: -1 } },
                { returnDocument: 'after' }
            );
            const likes = Math.max(0, (result as any)?.likes ?? 0);
            return { success: true, liked: false, likes };
        } else {
            // Like: insert record and increment
            await likesColl.insertOne({ seriesId, userId, createdAt: new Date() });
            const result = await db.collection('series').findOneAndUpdate(
                getQueryById(seriesId),
                { $inc: { likes: 1 } },
                { returnDocument: 'after' }
            );
            const likes = (result as any)?.likes ?? 0;
            return { success: true, liked: true, likes };
        }
    } catch (e: any) {
        return { success: false, liked: false, likes: 0 };
    }
}

/**
 * Gets a user's like status on a series and the total like count.
 */
export async function getSeriesLikeStatusAction(seriesId: string, userId: string): Promise<{ liked: boolean; likes: number }> {
    const db = await getDb();
    try {
        const [likeRecord, series] = await Promise.all([
            db.collection('series_likes').findOne({ seriesId, userId }),
            db.collection('series').findOne(getQueryById(seriesId), { projection: { likes: 1 } })
        ]);
        return { liked: !!likeRecord, likes: (series as any)?.likes ?? 0 };
    } catch {
        return { liked: false, likes: 0 };
    }
}

/**
 * Claims an invitation / referral code to award bonus coins to both users.
 */
export async function claimReferralCodeAction(userId: string, referralCodeInput: string) {
    const db = await getDb();
    try {
        if (!userId || !referralCodeInput) {
            return { success: false, error: 'User ID and Referral Code are required.' };
        }

        const cleanCode = referralCodeInput.trim().toUpperCase();

        const currentUser = await db.collection('users').findOne({ _id: userId as any });
        if (!currentUser) {
            return { success: false, error: 'User profile not found.' };
        }

        if (currentUser.referredBy) {
            return { success: false, error: 'You have already redeemed a referral code.' };
        }

        if (currentUser.referralCode && currentUser.referralCode.toUpperCase() === cleanCode) {
            return { success: false, error: 'You cannot use your own referral code.' };
        }

        // Find referrer user by referralCode or publicId
        const referrer = await db.collection('users').findOne({ 
            $or: [
                { referralCode: cleanCode },
                { referralCode: cleanCode.replace(/^SNAP-/, '') },
                { publicId: cleanCode.replace(/^SNAP-/, '') }
            ]
        });

        if (!referrer) {
            return { success: false, error: 'Invalid referral code. Please check and try again.' };
        }

        if (referrer._id.toString() === userId) {
            return { success: false, error: 'You cannot use your own referral code.' };
        }

        // Fetch settings for configured coin amounts
        const settings = await db.collection('settings').findOne({ _id: 'general' as any });
        if (settings?.referralEnabled === false) {
            return { success: false, error: 'Referral program is currently disabled.' };
        }

        const inviterReward = Number(settings?.referralRewardCoins ?? 50);
        const inviteeBonus = Number(settings?.referredBonusCoins ?? 50);

        // Update current user (invitee)
        await db.collection('users').updateOne(
            { _id: userId as any },
            { 
                $inc: { coins: inviteeBonus },
                $set: { referredBy: referrer.referralCode || cleanCode }
            }
        );

        // Update referrer (inviter)
        await db.collection('users').updateOne(
            { _id: referrer._id },
            { 
                $inc: { 
                    coins: inviterReward,
                    referralCount: 1,
                    referralEarnings: inviterReward
                }
            }
        );

        // Audit log transactions
        await db.collection('coin-transactions').insertMany([
            {
                userId,
                type: 'referral',
                amount: inviteeBonus,
                description: `Referral Bonus (Invited by ${referrer.displayName || cleanCode})`,
                createdAt: new Date()
            },
            {
                userId: referrer._id.toString(),
                type: 'referral',
                amount: inviterReward,
                description: `Referral Reward (Invited ${currentUser.displayName || 'Friend'})`,
                createdAt: new Date()
            }
        ]);

        revalidatePath('/', 'layout');
        return { 
            success: true, 
            coinsAwarded: inviteeBonus,
            bonusCoins: inviteeBonus,
            message: `Congratulations! You received +${inviteeBonus} bonus coins!`
        };
    } catch (e: any) {
        return handleError('claimReferralCodeAction', e, 'Failed to claim referral code.');
    }
}
