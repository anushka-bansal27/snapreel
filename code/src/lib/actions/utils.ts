import { ObjectId } from 'mongodb';

export const getQueryById = (id: string) => {
    try {
        return {
            $or: [
                { _id: ObjectId.isValid(id) ? new ObjectId(id) : null },
                { _id: id as any }
            ].filter(q => q._id !== null)
        };
    } catch (e) {
        return { _id: id as any };
    }
};

export const mapDoc = (doc: any) => {
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { id: _id.toString(), ...rest };
};

export function handleError(actionName: string, error: any, defaultMsg: string = 'An unexpected error occurred. Please try again.'): any {
    // Production error logging sanitization - hides stack traces, database details, etc.
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
        console.error(`[Error] in ${actionName}: ${error?.message || 'An unknown error occurred.'}`);
    } else {
        console.error(`Error in ${actionName}:`, error);
    }
    return { success: false, error: defaultMsg };
}

export function handleProfileError(actionName: string, error: any, defaultMsg: string = 'An error occurred.'): any {
    // Production error logging sanitization
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
        console.error(`[Profile Error] in ${actionName}: ${error?.message || 'An unknown error occurred.'}`);
    } else {
        console.error(`Error in ${actionName}:`, error);
    }
    return { error: defaultMsg };
}
