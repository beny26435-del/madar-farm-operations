import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MinePlus",
    short_name: "MinePlus",
    description: "مدیریت گزارش‌ها، تعمیرات و عملیات تیم",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f4f5f3",
    theme_color: "#17231d",
    lang: "fa",
    dir: "rtl",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
