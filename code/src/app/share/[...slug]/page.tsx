import { getShareItem } from '@/lib/data';
import { getMobileSettings } from '@/lib/data.actions';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Smartphone, Download, Star, Film, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';

export const revalidate = 60; // Cache for 60 seconds

interface PageProps {
    params: Promise<{ slug: string[] }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const { series, episode } = await getShareItem(slug);

    if (!series) {
        return {
            title: 'Series Not Found | SnapReels',
            description: 'Watch viral mini dramas and vertical reels on SnapReels.',
        };
    }

    const title = episode 
        ? `${series.title} - Episode ${episode.episodeInSeason} | SnapReels`
        : `${series.title} | Watch on SnapReels`;
    const description = series.metaDescription || series.description || 'Watch full episodes in HD on SnapReels.';
    const imageUrl = series.featuredCoverUrl || series.coverUrl;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: imageUrl ? [{ url: imageUrl, width: 800, height: 1200, alt: series.title }] : [],
            type: 'video.other',
            siteName: 'SnapReels',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: imageUrl ? [imageUrl] : [],
        },
    };
}

export default async function ShareLandingPage({ params }: PageProps) {
    const { slug } = await params;
    const { series, episode, totalEpisodes } = await getShareItem(slug);

    if (!series) {
        return (
            <div className="min-h-screen bg-[#09090C] text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                    <Film className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Drama Not Found</h1>
                <p className="text-sm text-neutral-400 max-w-sm mb-8">
                    The drama or episode you're looking for may have expired or moved. Explore our latest featured titles!
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-sm shadow-lg shadow-red-600/30 hover:opacity-90 transition-all"
                >
                    Explore SnapReels
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    const mobileSettings = await getMobileSettings();

    const packageName = mobileSettings?.androidPackageName || 'com.snapreels.devsnaplix';
    const playStoreUrl = mobileSettings?.androidPlayStoreUrl || `https://play.google.com/store/apps/details?id=${packageName}`;
    const iosAppStoreUrl = mobileSettings?.iosAppStoreUrl || '';

    const enableWeb = mobileSettings?.enableWebPlayer !== false;
    const enableAndroid = mobileSettings?.enableAndroidApp !== false;
    const enableIos = mobileSettings?.enableIosApp !== false && !!iosAppStoreUrl;
    const autoOpen = mobileSettings?.autoOpenApp === true;

    // Web Player URL
    const webUrl = `/en/series/${series.slug || series.id}${episode ? `?ep=${episode.episodeInSeason}` : ''}`;

    // Android Intent URI:
    // When opened in Chrome on Android:
    // - If com.snapreels.devsnaplix is installed: opens snapreels://drama/{id}
    // - If not installed: falls back to browser_fallback_url (Google Play Store)
    const encodedPlayStore = encodeURIComponent(playStoreUrl);
    const androidIntentUri = `intent://drama/${series.id}#Intent;scheme=snapreels;package=${packageName};S.browser_fallback_url=${encodedPlayStore};end`;
    const appCustomScheme = `snapreels://drama/${series.id}`;

    const posterUrl = series.coverUrl || series.featuredCoverUrl || '';
    const backdropUrl = series.featuredCoverUrl || series.coverUrl || '';

    return (
        <div className="min-h-screen bg-[#09090C] text-white relative overflow-x-hidden flex flex-col justify-between selection:bg-red-600 selection:text-white">
            {/* Ambient Background Blur */}
            {backdropUrl && (
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div
                        className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-20 scale-125 transition-transform duration-1000"
                        style={{ backgroundImage: `url(${backdropUrl})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#09090C]/80 via-[#09090C]/95 to-[#09090C]" />
                </div>
            )}

            {/* Top Navigation / Brand */}
            <header className="relative z-10 w-full max-w-xl mx-auto px-5 pt-6 pb-2 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center font-black text-lg tracking-wider shadow-lg shadow-red-600/30 group-hover:scale-105 transition-transform">
                        S
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-100 to-neutral-400">
                            SnapReels
                        </span>
                        <span className="text-[10px] text-neutral-400 font-medium tracking-wide -mt-1 uppercase">
                            Mini Series & Reels
                        </span>
                    </div>
                </Link>

                <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-red-600/10 border border-red-500/20 text-red-400 font-semibold tracking-wide uppercase flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Exclusive
                    </span>
                </div>
            </header>

            {/* Main Content Container */}
            <main className="relative z-10 w-full max-w-md mx-auto px-5 py-6 flex-1 flex flex-col justify-center">
                {/* Movie Poster Card */}
                <div className="relative mx-auto w-52 sm:w-60 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl shadow-red-950/40 border border-white/10 group mb-6">
                    {posterUrl ? (
                        <Image
                            src={posterUrl}
                            alt={series.title}
                            fill
                            priority
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 640px) 208px, 240px"
                        />
                    ) : (
                        <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                            <Film className="w-12 h-12 text-neutral-700" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                    {/* Overlay Badges */}
                    <div className="absolute top-3 left-3">
                        <span className="bg-red-600/90 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow">
                            HD 1080P
                        </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-neutral-200">
                        <span className="flex items-center gap-1 font-bold text-amber-400 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded">
                            <Star className="w-3 h-3 fill-amber-400" />
                            9.8
                        </span>
                        <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded font-medium text-[11px]">
                            {episode ? `Episode ${episode.episodeInSeason}` : `${totalEpisodes || 1}+ Episodes`}
                        </span>
                    </div>
                </div>

                {/* Movie Metadata */}
                <div className="text-center space-y-3 mb-8">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white line-clamp-2">
                        {series.title}
                    </h1>

                    {episode && (
                        <p className="text-xs font-semibold text-red-400 uppercase tracking-widest">
                            Episode {episode.episodeInSeason} of {totalEpisodes || 'Full Series'}
                        </p>
                    )}

                    {/* Genres / Tags */}
                    {series.genres && series.genres.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                            {series.genres.slice(0, 3).map((genre, idx) => (
                                <span
                                    key={idx}
                                    className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-300"
                                >
                                    {genre}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Synopsis */}
                    <p className="text-xs text-neutral-300 line-clamp-3 leading-relaxed max-w-sm mx-auto px-2">
                        {series.description || 'Watch this captivating drama with full HD vertical reels and breathtaking romance, suspense, and unexpected twists.'}
                    </p>
                </div>

                {/* CTAs / Action Buttons */}
                <div className="w-full space-y-3">
                    {/* Primary Button: Open in SnapReels App (Android Intent) */}
                    {enableAndroid && (
                        <a
                            id="btn-open-android"
                            href={androidIntentUri}
                            data-scheme={appCustomScheme}
                            data-playstore={playStoreUrl}
                            className="group relative w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-[#E50914] via-[#D81F26] to-[#B81D24] text-white shadow-lg shadow-red-600/25 hover:shadow-red-600/40 active:scale-[0.98] transition-all overflow-hidden"
                        >
                            <div className="flex items-center gap-3.5 z-10">
                                <div className="w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center text-white">
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-black tracking-wide uppercase flex items-center gap-1.5">
                                        Watch in SnapReels App
                                    </div>
                                    <div className="text-[11px] text-white/80 font-medium">
                                        Installed? Opens Drama Directly
                                    </div>
                                </div>
                            </div>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform z-10 text-white/90" />
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                    )}

                    {/* Secondary Button: Watch on Website */}
                    {enableWeb && (
                        <Link
                            href={webUrl}
                            className="group w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-neutral-900/80 hover:bg-neutral-800/80 border border-white/10 hover:border-white/20 text-white shadow active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white">
                                    <Play className="w-5 h-5 fill-white" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold tracking-wide">
                                        Watch on Website
                                    </div>
                                    <div className="text-[11px] text-neutral-400 font-medium">
                                        Play instantly in browser without app
                                    </div>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </Link>
                    )}

                    {/* Tertiary Button: iOS App Store (if configured) */}
                    {enableIos && (
                        <a
                            href={iosAppStoreUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group w-full flex items-center justify-between p-3.5 rounded-xl bg-neutral-900/50 hover:bg-neutral-800/50 border border-white/5 text-neutral-300 hover:text-white text-xs font-semibold transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <Download className="w-4 h-4 text-neutral-400" />
                                <span>Get on Apple App Store (iOS)</span>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300" />
                        </a>
                    )}
                </div>

                {/* Auto-Open Script for Android Mobile Devices */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                var autoOpen = ${autoOpen};
                                var intentUri = ${JSON.stringify(androidIntentUri)};
                                var fallbackUrl = ${JSON.stringify(playStoreUrl)};
                                var isAndroid = /Android/i.test(navigator.userAgent);

                                var btn = document.getElementById('btn-open-android');
                                if (btn) {
                                    btn.addEventListener('click', function(e) {
                                        if (!isAndroid) {
                                            // If on desktop or iOS, redirect to playstore url
                                            e.preventDefault();
                                            window.open(fallbackUrl, '_blank');
                                        }
                                    });
                                }

                                if (autoOpen && isAndroid) {
                                    setTimeout(function() {
                                        window.location.href = intentUri;
                                    }, 800);
                                }
                            })();
                        `,
                    }}
                />
            </main>

            {/* Footer */}
            <footer className="relative z-10 w-full max-w-md mx-auto px-5 py-6 text-center text-xs text-neutral-500 border-t border-white/5">
                <p className="mb-2">
                    SnapReels &copy; {new Date().getFullYear()} • Premium Short Drama Network
                </p>
                <div className="flex items-center justify-center gap-4 text-[11px] text-neutral-400">
                    <Link href="/" className="hover:text-white transition-colors">Home</Link>
                    <span>•</span>
                    <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                    <span>•</span>
                    <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                </div>
            </footer>
        </div>
    );
}
