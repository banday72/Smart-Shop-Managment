import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Banday Mart POS",
    short_name: "Banday POS",
    description: "Fast retail checkout for Banday Mart.",
    start_url: "/pos",
    display: "standalone",
    background_color: "#f7f8fb",
    theme_color: "#0b1220",
    icons: [
      { src: "/logo.png", sizes: "192x192", type: "image/png" },
      { src: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
