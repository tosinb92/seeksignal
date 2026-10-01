"use client";
import { useState } from "react";
export default function WebsiteScreenshot({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div role="status" style={{ padding: "2rem", minHeight: 180 }}>
      <p>Website preview is temporarily unavailable. Your diagnostic is still available below.</p>
      <a href={/^https?:\/\//i.test(url) ? url : `https://${url}`} target="_blank" rel="noopener noreferrer">Open the analysed website ↗</a>
    </div>
  ) : (
    <img src={`/api/website-screenshot?url=${encodeURIComponent(url)}`} alt={`Website screenshot of ${url}`} onError={() => setFailed(true)} />
  );
}
