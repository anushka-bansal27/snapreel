export const DEMO_MODE_MUTATION_MESSAGE = 'Please change DEMO_MODE=true to DEMO_MODE=false in .env file.';

export function isDemoMode(): boolean {
    return process.env.DEMO_MODE?.trim().toLowerCase() === 'true';
}

export function getDemoModeMutationError() {
    if (!isDemoMode()) return null;
    return {
        success: false as const,
        error: DEMO_MODE_MUTATION_MESSAGE,
        message: DEMO_MODE_MUTATION_MESSAGE,
    };
}
