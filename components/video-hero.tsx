'use client';

import { useState, useRef } from 'react';
import { Pause, Play } from 'lucide-react';

export function VideoHero() {
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* Video Background */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/videos/SGC_Promotional.mp4" type="video/mp4" />
      </video>

      {/* Overlay gradient for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />

      {/* Pause/Play Button - Top Right */}
      <button
        onClick={togglePlayPause}
        className="absolute top-8 right-8 z-20 w-12 h-12 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all duration-200 border border-white/30"
        aria-label={isPaused ? 'Play video' : 'Pause video'}
      >
        {isPaused ? (
          <Play className="w-5 h-5 text-white ml-0.5" />
        ) : (
          <Pause className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center px-6 lg:px-16">
        {/* Main Heading - Left Aligned */}
        <h1 className="text-white text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-left mb-8 tracking-tight max-w-4xl">
          Where Passion<br />Becomes Practice
        </h1>

        {/* Bottom Blue Text Block - Full Width */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="bg-[#1e3a8a]/90 backdrop-blur-sm border-t-4 border-blue-400 py-8 px-6 lg:px-16">
            <p className="text-white/95 text-base md:text-lg leading-relaxed max-w-3xl">
              A student-led investment community grounded in mentorship, collaboration, and hands-on learning in the markets.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
