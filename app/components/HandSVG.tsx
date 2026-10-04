import React, { useEffect, useState } from 'react';

export default function HandSVG({ letter }: { letter: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/fsl/wikimedia_images.json')
      .then(res => res.json())
      .then(data => {
        if (data[letter]) {
          setImageUrl(data[letter]);
        }
      })
      .catch(err => console.error("Failed to load images", err));
  }, [letter]);

  if (!imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-purple-300 font-black animate-pulse">
        GENERATING SIGN...
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 rounded-2xl flex items-center justify-center relative overflow-hidden p-1">
      {/* Background aesthetic elements */}
      <div className="absolute w-36 h-36 bg-fuchsia-500/20 blur-3xl rounded-full"></div>
      
      <img src={imageUrl} alt={`Sign for ${letter}`} className="w-full h-full object-contain z-10 p-1 drop-shadow-2xl invert brightness-125" />
    </div>
  );
}
