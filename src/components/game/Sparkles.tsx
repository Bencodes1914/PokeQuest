"use client";

import React, { useState, useEffect } from 'react';

const SPARKLE_COUNT = 10;
const SPARKLE_DURATION = 800;

interface Sparkle {
  id: number;
  top: string;
  left: string;
}

interface SparklesProps {
  children: React.ReactNode;
  isActive: boolean;
}

export const Sparkles: React.FC<SparklesProps> = ({ children, isActive }) => {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    if (isActive) {
      const newSparkles = Array.from({ length: SPARKLE_COUNT }).map((_, i) => ({
        id: i,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
      }));
      setSparkles(newSparkles);

      const timer = setTimeout(() => {
        setSparkles([]);
      }, SPARKLE_DURATION);

      return () => clearTimeout(timer);
    }
  }, [isActive]);

  return (
    <div className="relative">
      {children}
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="sparkle"
          style={{ top: sparkle.top, left: sparkle.left }}
        />
      ))}
    </div>
  );
};
