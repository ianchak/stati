/**
 * Particles.js initialization and dark mode adaptation for the homepage hero.
 */

// Type declarations for particles.js library
declare global {
  interface Window {
    particlesJS: (elementId: string, config: ParticlesConfig) => void;
    pJSDom: Array<{
      pJS: {
        particles: {
          color: { value: string[] };
          line_linked: { color: string; opacity: number };
          array?: Array<{ color: { value: string } }>;
        };
        fn: {
          vendors: {
            destroypJS: () => void;
          };
        };
      };
    }>;
  }
}

interface ParticlesConfig {
  particles: {
    number: { value: number; density: { enable: boolean; value_area: number } };
    color: { value: string[] };
    shape: { type: string };
    opacity: {
      value: number;
      random: boolean;
      anim: { enable: boolean; speed: number; opacity_min: number; sync: boolean };
    };
    size: {
      value: number;
      random: boolean;
      anim: { enable: boolean; speed: number; size_min: number; sync: boolean };
    };
    line_linked: {
      enable: boolean;
      distance: number;
      color: string;
      opacity: number;
      width: number;
    };
    move: {
      enable: boolean;
      speed: number;
      direction: string;
      random: boolean;
      straight: boolean;
      out_mode: string;
      bounce: boolean;
    };
  };
  interactivity: {
    detect_on: string;
    events: {
      onhover: { enable: boolean; mode: string };
      resize: boolean;
    };
    modes: {
      grab: { distance: number; line_linked: { opacity: number } };
    };
  };
  retina_detect: boolean;
}

const PARTICLES_CONFIG: ParticlesConfig = {
  particles: {
    number: {
      value: 60,
      density: {
        enable: true,
        value_area: 1000,
      },
    },
    color: {
      value: ['#3b82f6', '#6366f1'],
    },
    shape: {
      type: 'circle',
    },
    opacity: {
      value: 0.4,
      random: true,
      anim: {
        enable: true,
        speed: 1,
        opacity_min: 0.15,
        sync: false,
      },
    },
    size: {
      value: 3.5,
      random: true,
      anim: {
        enable: true,
        speed: 2,
        size_min: 1,
        sync: false,
      },
    },
    line_linked: {
      enable: true,
      distance: 150,
      color: '#3b82f6',
      opacity: 0.25,
      width: 1.5,
    },
    move: {
      enable: true,
      speed: 1,
      direction: 'none',
      random: true,
      straight: false,
      out_mode: 'out',
      bounce: false,
    },
  },
  interactivity: {
    detect_on: 'canvas',
    events: {
      onhover: {
        enable: true,
        mode: 'grab',
      },
      resize: true,
    },
    modes: {
      grab: {
        distance: 180,
        line_linked: {
          opacity: 0.3,
        },
      },
    },
  },
  retina_detect: true,
};

let particlesInitialized = false;
let observer: MutationObserver | null = null;
let initTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Updates particle colors based on dark mode state.
 */
function updateParticleColors(): void {
  const isDark =
    document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (window.pJSDom && window.pJSDom[0] && window.pJSDom[0].pJS) {
    const particles = window.pJSDom[0].pJS.particles;
    const newColors = isDark ? ['#60a5fa', '#818cf8'] : ['#3b82f6', '#6366f1'];

    particles.color.value = newColors;
    particles.line_linked.color = isDark ? '#60a5fa' : '#3b82f6';
    particles.line_linked.opacity = isDark ? 0.2 : 0.25;

    if (particles.array) {
      particles.array.forEach((particle, index) => {
        const color = newColors[index % newColors.length];
        if (color) {
          particle.color.value = color;
        }
      });
    }
  }
}

/**
 * Initializes particles.js with configuration.
 * Waits for the library to be loaded if necessary.
 */
function initParticlesInternal(): void {
  if (particlesInitialized) return;

  // Check if particles container exists
  const container = document.getElementById('particles-js');
  if (!container) return;

  // Wait for particles.js library to load
  if (typeof window.particlesJS === 'undefined') {
    initTimeout = setTimeout(initParticlesInternal, 50);
    return;
  }

  particlesInitialized = true;

  window.particlesJS('particles-js', PARTICLES_CONFIG);

  // Set up dark mode observer
  observer = new MutationObserver(updateParticleColors);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  // Initial color update
  setTimeout(updateParticleColors, 100);
}

/**
 * Cleans up particles.js instance and observers.
 */
function cleanupParticles(): void {
  if (initTimeout) {
    clearTimeout(initTimeout);
    initTimeout = null;
  }

  if (observer) {
    observer.disconnect();
    observer = null;
  }

  if (window.pJSDom && window.pJSDom[0]) {
    window.pJSDom[0].pJS.fn.vendors.destroypJS();
    window.pJSDom = [];
  }

  particlesInitialized = false;
}

/**
 * Initializes particles.js for the homepage hero section.
 * Sets up the particle animation and dark mode color adaptation.
 */
export function initParticles(): void {
  initParticlesInternal();
  window.addEventListener('beforeunload', cleanupParticles);
}
