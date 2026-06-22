import React, { useEffect, useRef } from 'react';

export default function BackgroundLayer() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const initializeVideo = () => {
      if (Number.isNaN(video.duration) || video.duration === 0) return;

      const now = new Date();
      const secondsSinceMidnight = 
        now.getHours() * 3600 + 
        now.getMinutes() * 60 + 
        now.getSeconds() + 
        now.getMilliseconds() / 1000;
      
      // Calculate how far we are into the 24-hour day (0.0 to 1.0)
      const fractionOfDay = secondsSinceMidnight / 86400;
      
      // Start the video from the current time of day
      video.currentTime = fractionOfDay * video.duration;
      
      // Scale the playback rate so that the video duration fits exactly 24 hours (86400 seconds)
      const targetPlaybackRate = video.duration / 86400;
      video.playbackRate = targetPlaybackRate;
      
      // Play the video naturally at this scaled playback rate
      video.play().catch(e => console.error("Video play failed:", e));
    };

    const onLoadedMetadata = () => {
      initializeVideo();
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);

    // If metadata is already loaded when the effect runs, initialize immediately
    if (video.readyState >= 1) {
      initializeVideo();
    }

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, []);

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
        backgroundColor: '#050b18'
      }}
    >
      <video
        ref={videoRef}
        src="/city_skyline.mp4"
        muted
        playsInline
        loop
        preload="auto"
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
    </div>
  );
}
