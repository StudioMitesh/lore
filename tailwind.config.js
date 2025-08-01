/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
        '*.{js,ts,jsx,tsx,mdx}',
    ],
    prefix: '',
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px',
            },
        },
        extend: {
            colors: {
                parchment: {
                    DEFAULT: '#fdf6e3',
                    light: '#f5f0e1',
                    dark: '#ece2d0',
                },
                gold: {
                    DEFAULT: '#d4af37',
                    light: '#e9c767',
                    dark: '#b3941f',
                },
                deepbrown: {
                    DEFAULT: '#4b3b2a',
                    light: '#6a543c',
                    dark: '#362b1f',
                },
                forest: {
                    DEFAULT: '#4c6b54',
                    light: '#5f8369',
                    dark: '#3a5241',
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
            },
            fontFamily: {
                display: ['"Playfair Display"', 'serif'],
                body: ['"DM Sans"', 'sans-serif'],
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' },
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' },
                },
                glow: {
                    '0%, 100%': {
                        boxShadow: '0 0 5px rgba(212, 175, 55, 0.5)',
                        transform: 'scale(1)',
                    },
                    '50%': {
                        boxShadow: '0 0 15px rgba(212, 175, 55, 0.8)',
                        transform: 'scale(1.02)',
                    },
                },
                'map-unfold': {
                    '0%': {
                        opacity: '0',
                        transform: 'scaleY(0.8)',
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'scaleY(1)',
                    },
                },
                'pin-drop': {
                    '0%': {
                        opacity: '0',
                        transform: 'translateY(-20px)',
                    },
                    '70%': {
                        transform: 'translateY(2px)',
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'translateY(0)',
                    },
                },
                'page-turn': {
                    '0%': {
                        opacity: '0',
                        transform: 'rotateY(-30deg)',
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'rotateY(0deg)',
                    },
                },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                float: 'float 3s ease-in-out infinite',
                glow: 'glow 2s ease-in-out infinite',
                'map-unfold': 'map-unfold 0.8s ease-out forwards',
                'pin-drop': 'pin-drop 0.6s ease-out forwards',
                'page-turn': 'page-turn 0.5s ease-out forwards',
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
};
