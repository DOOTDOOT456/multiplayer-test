import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#07090c",
        hull: "#0c1015",
        panel: "#111820",
        raised: "#16202b",
        edge: "#22303e",
        steel: "#8296a9",
        ash: "#d3dde6",
        ember: {
          DEFAULT: "#ff8a3d",
          soft: "#ffb454",
          deep: "#b34d13",
        },
        plasma: "#5cb8ff",
        toxin: "#7dde8b",
        alarm: "#ff5f56",
        gold: "#ffcf5c",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(255,255,255,0.03), 0 12px 40px -12px rgba(0,0,0,0.8)",
        ember: "0 0 24px -4px rgba(255,138,61,0.45)",
      },
      keyframes: {
        "ember-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "sweep": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "rise": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "ember-pulse": "ember-pulse 2.4s ease-in-out infinite",
        sweep: "sweep 3.2s linear infinite",
        rise: "rise 0.5s ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;
