"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("SeekSignal route error", error);
  }, [error]);

  return (
    <main className="legalPage">
      <div className="legalShell">
        <span className="legalKicker">Something went wrong</span>
        <h1>SeekSignal hit an unexpected error.</h1>
        <p className="legalLead">Your saved data has not been intentionally changed. Try the action again, or return to the homepage.</p>
        <div style={{display:"flex",gap:10,marginTop:24}}>
          <button onClick={reset} style={{height:42,padding:"0 16px",border:0,borderRadius:9,background:"#c4f873",fontWeight:800}}>Try again</button>
          <a href="/" style={{display:"inline-flex",alignItems:"center",height:42,padding:"0 16px",border:"1px solid rgba(255,255,255,.1)",borderRadius:9}}>Homepage</a>
        </div>
      </div>
    </main>
  );
}
