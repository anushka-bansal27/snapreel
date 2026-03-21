import { NextResponse } from 'next/server';
import { i18n } from '@/i18n-config';

export async function GET() {
  return NextResponse.json({ locales: i18n.locales });
}
