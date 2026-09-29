import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="legalPage">
      <div className="legalShell">
        <Link href="/" className="legalBack">← SeekSignal</Link>
        <span className="legalKicker">Terms</span>
        <h1>Terms of use</h1>
        <p className="legalLead">Last updated 29 September 2026. These terms apply to the current pre-launch version of SeekSignal.</p>

        <section>
          <h2>What SeekSignal provides</h2>
          <p>SeekSignal provides website-readiness diagnostics, stored project reports, competitor tracking and controlled AI-model visibility testing where enabled.</p>
        </section>
        <section>
          <h2>What scores mean</h2>
          <p>Website-readiness scores are diagnostic indicators based on observable website signals. They are not guarantees of search ranking, AI recommendation, traffic, leads or revenue.</p>
        </section>
        <section>
          <h2>AI visibility results</h2>
          <p>AI visibility testing records outputs from supported provider model APIs under controlled prompts. Results may change between runs and may differ from answers shown in consumer products such as ChatGPT, Gemini, Claude or Perplexity.</p>
        </section>
        <section>
          <h2>Your responsibilities</h2>
          <p>You must only submit websites and business information that you are entitled to analyse and must not use SeekSignal to probe private networks, bypass access controls or perform unlawful activity.</p>
        </section>
        <section>
          <h2>Recommendations</h2>
          <p>SeekSignal recommendations are intended to support informed decisions. You remain responsible for reviewing changes before implementing them and for measuring their effect on your business.</p>
        </section>
        <section>
          <h2>Pre-launch service</h2>
          <p>SeekSignal is currently being prepared for paid public launch. Features may change as reliability, methodology and billing controls are completed. Paid-plan terms and billing details will be added before payments are enabled.</p>
        </section>
      </div>
    </main>
  );
}
