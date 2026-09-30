"use client";

import { useEffect } from "react";
import { trackEvent } from "../lib/analytics/client";

export default function PageViewTracker() {
  useEffect(() => {
    void trackEvent("page_view");
  }, []);

  return null;
}
