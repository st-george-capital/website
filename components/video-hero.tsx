"use client";

import { useState, useRef, useEffect } from "react";
import { useReducedMotion, motion } from "framer-motion";
import Link from "next/link";
import { Pause, Play, ArrowRight, ArrowDown } from "lucide-react";

export function VideoHero() {
  const [isPaused, setIsPaused] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (reduced) {
      video.pause();
      return;
    }
    video.play().catch(() => setIsPaused(true));
  }, [reduced]);
  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => setIsPaused(true));
    else video.pause();
  };
  return (
    <section className="video-hero">
      <video
        ref={videoRef}
        loop
        muted
        playsInline
        preload="metadata"
        poster="/videos/sgc-poster.jpg"
        onPlay={() => setIsPaused(false)}
        onPause={() => setIsPaused(true)}
        className="hero-film"
      >
        <source src="/videos/SGC_Promotional.mp4" type="video/mp4" />
      </video>
      <div className="hero-shade" />
      <div className="video-hero-content">
        <p className="eyebrow">
          St. George Capital <span>/</span> University of Toronto
        </p>
        <h1 aria-label="Where Passion Becomes Practice">
          {["Where Passion", "Becomes Practice"].map((line, i) => (
            <span className="hero-line" key={line}>
              <motion.span
                initial={{ y: "105%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 0.9,
                  delay: 0.15 + i * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h1>
        <Link href="/research" className="text-link hero-research-link">
          Explore Our Research <ArrowRight size={19} />
        </Link>
      </div>
      <div className="hero-bottom">
        <div className="hero-description">
          <span className="hero-description-rule" />
          <p>
            A student-led investment community grounded in mentorship,
            collaboration, and hands-on learning in the markets.
          </p>
          <a href="#about" aria-label="Discover St. George Capital">
            <ArrowDown size={21} />
          </a>
        </div>
        <button
          onClick={toggle}
          className="film-control"
          aria-label={isPaused ? "Play video" : "Pause video"}
        >
          {isPaused ? <Play size={16} /> : <Pause size={16} />}
        </button>
      </div>
    </section>
  );
}
