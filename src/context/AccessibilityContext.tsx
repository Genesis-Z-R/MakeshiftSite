import React, { createContext, useContext, useState, useEffect } from 'react';

interface AccessibilityContextType {
  darkMode: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  toggleDarkMode: () => void;
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [highContrast, setHighContrast] = useState(() => {
    const saved = localStorage.getItem('highContrast');
    return saved ? JSON.parse(saved) : false;
  });

  const [reducedMotion, setReducedMotion] = useState(() => {
    const saved = localStorage.getItem('reducedMotion');
    return saved ? JSON.parse(saved) : window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const [announcement, setAnnouncement] = useState<{ message: string; priority: 'polite' | 'assertive' } | null>(null);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('highContrast', JSON.stringify(highContrast));
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem('reducedMotion', JSON.stringify(reducedMotion));
    if (reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  }, [reducedMotion]);

  const toggleDarkMode = () => setDarkMode((prev: boolean) => !prev);
  const toggleHighContrast = () => setHighContrast((prev: boolean) => !prev);
  const toggleReducedMotion = () => setReducedMotion((prev: boolean) => !prev);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement({ message, priority });
    // Clear announcement after a short delay so it can be repeated if needed
    setTimeout(() => setAnnouncement(null), 1000);
  };

  return (
    <AccessibilityContext.Provider
      value={{
        darkMode,
        highContrast,
        reducedMotion,
        toggleDarkMode,
        toggleHighContrast,
        toggleReducedMotion,
        announce,
      }}
    >
      {children}
      {/* Screen Reader Live Region */}
      <div
        aria-live={announcement?.priority || 'polite'}
        aria-atomic="true"
        className="sr-only"
      >
        {announcement?.message}
      </div>
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
