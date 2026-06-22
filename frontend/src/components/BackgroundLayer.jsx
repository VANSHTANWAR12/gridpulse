import React, { useEffect, useRef } from 'react';

export default function BackgroundLayer() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      if (Number.isNaN(video.duration) || video.duration === 0) return;
      
      const now = new Date();
      const secondsSinceMidnight = 
        now.getHours() * 3600 + 
        now.getMinutes() * 60 + 
        now.getSeconds() + 
        now.getMilliseconds() / 1000;
      
      // Calculate how far we are into the 24-hour day (0.0 to 1.0)
      const fractionOfDay = secondsSinceMidnight / 86400;
      
      // Sync the video playhead directly with the time of day fraction
      video.currentTime = fractionOfDay * video.duration;
    };

    const onLoadedMetadata = () => {
      updateTime();
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    
    // Periodically force the playhead to match the exact current time
    const interval = setInterval(updateTime, 1000);

    // Initial check if metadata is already loaded
    if (video.readyState >= 1) {
      updateTime();
    }

    return () => {
      clearInterval(interval);
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
        autoPlay
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
