/**
 * tsParticles initialization and dark mode adaptation for the homepage hero.
 */

import type { Container, ISourceOptions } from '@tsparticles/engine';
import { tsParticles } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';

/** Light mode particle colors */
const LIGHT_COLORS = ['#3b82f6', '#6366f1'];
/** Dark mode particle colors */
const DARK_COLORS = ['#60a5fa', '#818cf8'];

/**
 * Gets the current dark mode state.
 */
function isDarkMode(): boolean {
  return (
    document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

/**
 * Creates the particles configuration based on dark mode state.
 */
function getParticlesConfig(isDark: boolean): ISourceOptions {
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const linkColor = isDark ? '#60a5fa' : '#3b82f6';
  const linkOpacity = isDark ? 0.2 : 0.25;

  return {
    particles: {
      number: {
        value: 60,
        density: {
          enable: true,
          width: 1000,
          height: 1000,
        },
      },
      color: {
        value: colors,
      },
      shape: {
        type: 'circle',
      },
      opacity: {
        value: { min: 0.15, max: 0.4 },
        animation: {
          enable: true,
          speed: 1,
          sync: false,
        },
      },
      size: {
        value: { min: 1, max: 3.5 },
        animation: {
          enable: true,
          speed: 2,
          sync: false,
        },
      },
      links: {
        enable: true,
        distance: 150,
        color: linkColor,
        opacity: linkOpacity,
        width: 1.5,
      },
      move: {
        enable: true,
        speed: 1,
        direction: 'none',
        random: true,
        straight: false,
        outModes: {
          default: 'out',
        },
      },
    },
    interactivity: {
      detectsOn: 'canvas',
      events: {
        onHover: {
          enable: true,
          mode: 'grab',
        },
        resize: {
          enable: true,
        },
      },
      modes: {
        grab: {
          distance: 180,
          links: {
            opacity: 0.3,
          },
        },
      },
    },
    detectRetina: true,
  };
}

let particlesContainer: Container | undefined;
let observer: MutationObserver | null = null;
let particlesInitialized = false;

/**
 * Updates particle colors based on dark mode state.
 * Reinitializes the container with new color configuration.
 */
async function updateParticleColors(): Promise<void> {
  if (!particlesContainer) return;

  const isDark = isDarkMode();

  // Destroy and recreate with new colors
  particlesContainer.destroy();
  particlesContainer = await tsParticles.load({
    id: 'particles-js',
    options: getParticlesConfig(isDark),
  });
}

/**
 * Initializes tsParticles with configuration.
 */
async function initParticlesInternal(): Promise<void> {
  if (particlesInitialized) return;

  // Check if particles container exists
  const containerElement = document.getElementById('particles-js');
  if (!containerElement) return;

  particlesInitialized = true;

  // Load the slim bundle (includes common features)
  await loadSlim(tsParticles);

  // Initialize particles
  const isDark = isDarkMode();
  particlesContainer = await tsParticles.load({
    id: 'particles-js',
    options: getParticlesConfig(isDark),
  });

  // Set up dark mode observer
  observer = new MutationObserver(() => {
    void updateParticleColors();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
}

/**
 * Cleans up tsParticles instance and observers.
 */
function cleanupParticles(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  if (particlesContainer) {
    particlesContainer.destroy();
    particlesContainer = undefined;
  }

  particlesInitialized = false;
}

/**
 * Initializes tsParticles for the homepage hero section.
 * Sets up the particle animation and dark mode color adaptation.
 */
export function initParticles(): void {
  void initParticlesInternal();
  window.addEventListener('beforeunload', cleanupParticles);
}
