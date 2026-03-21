import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center relative overflow-hidden px-4 selection:bg-pink-500 selection:text-white">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-pink-600/30 via-purple-600/20 to-indigo-600/30 blur-[140px] rounded-full pointer-events-none -z-10 animate-pulse duration-1000" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-pink-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-10 right-10 w-[300px] h-[300px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Main Glass Box */}
      <div className="max-w-md w-full backdrop-blur-2xl bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 sm:p-12 text-center shadow-[0_0_50px_rgba(248,87,166,0.15)] relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Glowing 404 Text */}
        <div className="relative inline-block mb-4">
          <span className="text-7xl sm:text-8xl font-black tracking-tighter bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(248,87,166,0.6)]">
            404
          </span>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-[1px]" />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-4 mb-2">
          Off the Script!
        </h1>

        {/* Subtitle */}
        <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-8">
          The drama or page you are looking for has vanished into thin air or never existed in our reels.
        </p>

        {/* Return to Home Button */}
        <Link 
          href="/" 
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:via-purple-700 hover:to-indigo-700 text-white font-bold text-base tracking-wide shadow-[0_0_25px_rgba(248,87,166,0.4)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] inline-flex items-center justify-center gap-2 group"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="transition-transform group-hover:-translate-x-1"
          >
            <path d="m12 19-7-7 7-7"/>
            <path d="M19 12H5"/>
          </svg>
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Footer text */}
      <p className="mt-8 text-xs text-white/30 tracking-widest uppercase font-semibold">
        SnapReels Universe
      </p>
    </div>
  );
}
