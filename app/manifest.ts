import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "مدار عملیات فارم",
    short_name: "مدار",
    description: "مدیریت گزارش‌های روزانه و تعمیرات فارم",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f4f5f3",
    theme_color: "#17231d",
    lang: "fa",
    dir: "rtl",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
