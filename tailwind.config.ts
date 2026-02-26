import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        cairo: ["var(--font-cairo)", "Cairo", "system-ui", "sans-serif"],
        sans: ["var(--font-cairo)", "Cairo", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        teal: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
        },
        sage: {
          50:  "#f0faf5",
          100: "#d8f2e4",
          200: "#b4e4cc",
          300: "#82cfad",
          400: "#4db589",
          500: "#2d9a6c",
          600: "#1f7d56",
          700: "#196445",
          800: "#154f38",
          900: "#12402d",
          950: "#07231a",
        },
        coral: {
          50:  "#fff4ef",
          100: "#ffe6d8",
          200: "#fecdaf",
          300: "#feac7e",
          400: "#fb7e4b",
          500: "#f85d25",
          600: "#e8411a",
          700: "#c13218",
          800: "#9b2c1b",
          900: "#7e2a1c",
          950: "#44120b",
        },
        cream: {
          50:  "#fdfcfa",
          100: "#faf7f2",
          200: "#f3ede3",
          300: "#e8ddd0",
          400: "#d6c5b1",
          500: "#bea58f",
          600: "#a0846d",
          700: "#826857",
          800: "#6c5549",
          900: "#59463e",
          950: "#2f241e",
        },
        risk: {
          high: "hsl(var(--risk-high))",
          medium: "hsl(var(--risk-medium))",
          low: "hsl(var(--risk-low))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-from-end": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-risk": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(0 70% 45% / 0.4)" },
          "50%": { boxShadow: "0 0 0 8px hsl(0 70% 45% / 0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in-from-end 0.3s ease-out",
        "pulse-risk": "pulse-risk 2s ease-in-out infinite",
      },
    },
  },
  plugins: [animate],
};

export default config;
