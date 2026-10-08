/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#08080A',
        'bg-alt': '#0A0A0C',
        surface: '#0C0C0E',
        'surface-raised': '#0D0D10',
        'surface-hover': '#101013',
        ivory: '#F3F0EA',
        accent: '#FDD303',
        ink: '#0B0B0D',
        'grey-1': '#8C8A85',
        'grey-2': '#6F6D68',
        'grey-3': '#57554F',
      },
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        lux: 'cubic-bezier(.16, 1, .3, 1)',
      },
      keyframes: {
        // useMountReveal's rise-and-fade as plain CSS, so it starts at the
        // first paint instead of waiting for the page's JavaScript.
        // useReveal's entrance as plain CSS (see its `firstPaint` option).
        // Both CSS entrances start at opacity .01, not 0 (no visible
        // difference): the browser skips fully transparent text when it
        // measures the page's largest paint, and a CSS fade doesn't repaint,
        // so starting at 0 kept the heading from counting until JavaScript
        // repainted it.
        revealRise: {
          from: { opacity: '0.01', transform: 'translateY(34px) scale(.98)' },
          to: { opacity: '1', transform: 'none' },
        },
        heroRise: {
          from: { opacity: '0.01', transform: 'translateY(32px)' },
          to: { opacity: '1', transform: 'none' },
        },
        lcFloat: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        marqueeLeft: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        marqueeRight: {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        lcGlow: {
          '0%, 100%': { opacity: '.5', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.1)' },
        },
        lcRipple: {
          '0%': { transform: 'scale(.4)', opacity: '0' },
          '30%': { opacity: '.55' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
      },
      animation: {
        'hero-rise': 'heroRise 1.1s 80ms cubic-bezier(.16,1,.3,1) both',
        'reveal-rise': 'revealRise .9s cubic-bezier(.16,1,.3,1) both',
        'lc-float': 'lcFloat 4.5s ease-in-out infinite',
        'marquee-left': 'marqueeLeft 32s linear infinite',
        'marquee-right': 'marqueeRight 38s linear infinite',
        'lc-glow': 'lcGlow 7s ease-in-out infinite',
        'lc-ripple': 'lcRipple 2.1s ease-out infinite',
      },
    },
  },
  plugins: [],
}
