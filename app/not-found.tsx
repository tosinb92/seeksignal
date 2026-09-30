import Link from "next/link";

export default function NotFound() {
  return (
    <main className="legalPage">
      <div className="legalShell">
        <span className="legalKicker">404</span>
        <h1>That page doesn't exist.</h1>
        <p className="legalLead">Return to SeekSignal or start a new website-readiness audit.</p>
        <Link href="/" className="legalBack" style={{marginTop:24}}>← Back to SeekSignal</Link>
      </div>
    </main>
  );
}
