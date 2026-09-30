"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{margin:0,background:"#0a0d0c",color:"#eef3ef",fontFamily:"Arial, sans-serif"}}>
        <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24}}>
          <div style={{maxWidth:620}}>
            <div style={{fontSize:11,color:"#c4f873",textTransform:"uppercase",letterSpacing:1}}>SeekSignal</div>
            <h1 style={{fontSize:44,letterSpacing:-2,margin:"14px 0"}}>We couldn't load the application.</h1>
            <p style={{color:"#9aa49d",lineHeight:1.7}}>Try again. If the problem persists, no further action will be taken until the application can safely continue.</p>
            <button onClick={reset} style={{marginTop:18,height:42,padding:"0 16px",border:0,borderRadius:9,background:"#c4f873",fontWeight:800}}>Reload SeekSignal</button>
          </div>
        </main>
      </body>
    </html>
  );
}
