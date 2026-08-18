import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MinePlus",
    short_name: "MinePlus",
    description: "مدیریت گزارش‌ها، تعمیرات و عملیات تیم",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f4f5f3",
    theme_color: "#17231d",
    lang: "fa",
    dir: "rtl",
    categories: ["business", "productivity", "utilities"],
    icons: [
      { src: "/icons/mineplus-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/mineplus-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/mineplus-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
