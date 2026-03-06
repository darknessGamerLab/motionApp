/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                },
                slate: {
                    850: '#1a2332',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['Outfit', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'pulse-dot': 'pulseDot 2s infinite',
            },
            keyframes: {
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                slideUp: {
                    from: { transform: 'translateY(10px)', opacity: '0' },
                    to: { transform: 'translateY(0)', opacity: '1' },
                },
                pulseDot: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.4' },
                }
            }
        },
    },
    plugins: [],
}
