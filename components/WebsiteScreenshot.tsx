"use client";
import { useState } from "react";
export default function WebsiteScreenshot({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="websitePreviewFallback" role="status">
      <span className="websitePreviewFallbackIcon" aria-hidden="true">↗</span>
      <span className="websitePreviewFallbackLabel">Website preview</span>
      <strong>{url || "Your website"}</strong>
      <p>A live preview isn’t available right now. Your website analysis is still ready below.</p>
      {url ? <a href={/^https?:\/\//i.test(url) ? url : `https://${url}`} target="_blank" rel="noopener noreferrer">Open website <span aria-hidden="true">↗</span></a> : null}
    </div>
  ) : (
    <img src={`/api/website-screenshot?url=${encodeURIComponent(url)}`} alt={`Website screenshot of ${url}`} onError={() => setFailed(true)} />
  );
}
