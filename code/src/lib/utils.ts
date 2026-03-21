import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const countryCodeToEmoji = (countryCode: string) => {
    if (!countryCode || countryCode.length !== 2) return '🏳️';
    try {
        return countryCode
            .toUpperCase()
            .split('')
            .map((char) => String.fromCodePoint(char.charCodeAt(0) + 127397))
            .join('');
    } catch(e) {
        return '🏳️';
    }
};

/**
 * Formats numbers into compact notation (e.g., 1K, 1.5K, 1M)
 */
export function formatCompactNumber(number: number): string {
  if (number === undefined || number === null) return '0';
  
  return Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(number);
}
