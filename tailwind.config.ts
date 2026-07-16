import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		fontFamily: {
  			sans: [
  				'Manrope',
  				'sans-serif'
  			],
  			display: [
  				'Manrope',
  				'sans-serif'
  			],
  			mono: [
  				'JetBrains Mono',
  				'monospace'
  			]
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))',
  				hover: 'hsl(var(--primary-hover))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))',
  				tertiary: 'var(--text-tertiary)'
  			},
  			separator: {
  				DEFAULT: 'hsl(var(--separator-opaque))',
  				opaque: 'hsl(var(--separator-opaque))',
  				subtle: 'var(--separator-non-opaque)'
  			},
  			fill: {
  				primary: 'var(--fill-primary)',
  				secondary: 'var(--fill-secondary)',
  				tertiary: 'var(--fill-tertiary)'
  			},
  			ios: {
  				blue: 'hsl(var(--ios-blue))',
  				green: 'hsl(var(--ios-green))',
  				red: 'hsl(var(--ios-red))',
  				orange: 'hsl(var(--ios-orange))',
  				yellow: 'hsl(var(--ios-yellow))',
  				purple: 'hsl(var(--ios-purple))',
  				pink: 'hsl(var(--ios-pink))',
  				teal: 'hsl(var(--ios-teal))',
  				gray: 'hsl(var(--ios-gray))',
  				'gray-2': 'hsl(var(--ios-gray-2))',
  				'gray-3': 'hsl(var(--ios-gray-3))',
  				'gray-4': 'hsl(var(--ios-gray-4))',
  				'gray-5': 'hsl(var(--ios-gray-5))',
  				'gray-6': 'hsl(var(--ios-gray-6))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			status: {
  				success: 'hsl(var(--status-success))',
  				warning: 'hsl(var(--status-warning))',
  				danger: 'hsl(var(--status-danger))',
  				info: 'hsl(var(--status-info))',
  				foreground: 'hsl(var(--status-foreground))'
  			},
  			metric: {
  				blue: 'hsl(var(--card-blue))',
  				green: 'hsl(var(--card-green))',
  				red: 'hsl(var(--card-red))',
  				orange: 'hsl(var(--card-orange))',
  				purple: 'hsl(var(--card-purple))',
  				pink: 'hsl(var(--card-pink))',
  				teal: 'hsl(var(--card-teal))',
  				magenta: 'hsl(var(--card-magenta))',
  				brown: 'hsl(var(--card-brown))',
  				lime: 'hsl(var(--card-lime))',
  				darkBlue: 'hsl(var(--card-dark-blue))',
  				cyan: 'hsl(var(--card-cyan))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: '12px',
  			md: '8px',
  			sm: '6px'
  		},
  		boxShadow: {
  			card: '0 1px 3px rgba(0, 0, 0, 0.08)',
  			'card-hover': '0 4px 12px rgba(0, 0, 0, 0.12)',
  			'ios-sm': 'var(--shadow-sm)',
  			'ios-md': 'var(--shadow-md)',
  			'ios-lg': 'var(--shadow-lg)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'pulse-slow': {
  				'0%, 100%': {
  					opacity: '1'
  				},
  				'50%': {
  					opacity: '0.6'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'pulse-slow': 'pulse-slow 2s ease-in-out infinite'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
