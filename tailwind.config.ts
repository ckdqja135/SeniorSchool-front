import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    fontSize: {
      "title-1": "32px",
      "title-2": "24px",
      heading: "20px",
      medium: "14px",
      "label-medium": "13px",
      "caption-medium": "12px",
    },
    fontWeight: {
      extralight: "200",
      light: "300",
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      extrabold: "800",
      black: "900",
    },
    extend: {
      colors: {
        blue: {
          300: "#4165FA",
          200: "#8CA1FA",
          100: "#E7EBFD",
        },
        gray: {
          900: "#121212",
          800: "#333333",
          700: "#4F4F4F",
          600: "#828282",
          500: "#BDBDBD",
          400: "#D9D9D9",
          300: "#B9B9B9",
          200: "#E0E0E0",
          100: "#F5F5F5",
        },
        white: "#FFFFFF",
        black: "#000000",
        danger: "#F56973",
        primary: "#13C299",
      },
    },
  },
  plugins: [],
} satisfies Config;
