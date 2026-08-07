// src/lib/youtube.test.js
import { describe, it, expect } from "vitest";
import { youtubeEmbedUrl, isYoutubeUrl } from "./youtube";

describe("youtubeEmbedUrl", () => {
  it("standart watch?v= linkini embed URL'ine çevirir", () => {
    expect(youtubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("kısa youtu.be linkini embed URL'ine çevirir", () => {
    expect(youtubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("zaten embed formatındaki linki de tanır", () => {
    expect(youtubeEmbedUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("watch?v= linkindeki ekstra query parametrelerini (örn. &t=30s) yok sayar", () => {
    expect(youtubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("YouTube olmayan bir video URL'i için null döner", () => {
    expect(youtubeEmbedUrl("http://localhost:4000/mock-uploads/tenants/x/video.mp4")).toBeNull();
  });

  it("boş/null girdi için null döner", () => {
    expect(youtubeEmbedUrl("")).toBeNull();
    expect(youtubeEmbedUrl(null)).toBeNull();
  });
});

describe("isYoutubeUrl", () => {
  it("geçerli bir YouTube linki için true döner", () => {
    expect(isYoutubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
  });

  it("kendi Storage'ımızdaki bir video için false döner", () => {
    expect(isYoutubeUrl("http://localhost:4000/mock-uploads/tenants/x/video.mp4")).toBe(false);
  });
});
