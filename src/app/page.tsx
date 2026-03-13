'use client';

import { Suspense } from 'react';
import { Logo } from '../components/landing/Logo';
import { HeroSection } from '../components/landing/HeroSection';
import { RepoInput } from '../components/landing/RepoInput';
import { LandingBackground } from '../components/landing/LandingBackground';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

function LandingContent(): React.ReactElement {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated background */}
      <LandingBackground />

      {/* Language & theme switchers — above everything */}
      <div className="fixed top-4 right-4 flex items-center gap-2" style={{ zIndex: 20 }}>
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>

      {/* Content overlay */}
      <div
        className="relative flex flex-col items-center justify-center min-h-screen px-4"
        style={{ zIndex: 15 }}
      >
        <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
          {/* Glass card container for content */}
          <div className="landing-content-card flex flex-col items-center gap-6 px-8 py-10 rounded-3xl w-full">
            <Logo />
            <HeroSection />
            <RepoInput />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home(): React.ReactElement {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white dark:bg-slate-950" />}>
      <LandingContent />
    </Suspense>
  );
}
