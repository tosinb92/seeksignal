import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="legalPage">
      <div className="legalShell">
        <Link href="/" className="legalBack">← SeekSignal</Link>
        <span className="legalKicker">Privacy</span>
        <h1>Privacy notice</h1>
        <p className="legalLead">Last updated 29 September 2026. This notice explains the information SeekSignal uses to provide website-readiness audits, accounts and AI visibility testing.</p>

        <section>
          <h2>Information we collect</h2>
          <p>When you run an audit or create an account, SeekSignal may process your name, email address, business name, website address, project settings, audit results, competitor records and product usage information.</p>
        </section>
        <section>
          <h2>Website audits</h2>
          <p>SeekSignal fetches publicly accessible website content to evaluate observable readiness signals. Audit results and the website address may be stored so the report can be saved, compared and claimed into a workspace.</p>
        </section>
        <section>
          <h2>AI visibility tests</h2>
          <p>When you explicitly start an AI visibility test, category-led prompts may be sent to supported model providers through Vercel AI Gateway. The resulting model responses, mentions, citations and test metadata may be stored in your workspace. Provider-model results can differ from consumer AI applications.</p>
        </section>
        <section>
          <h2>Service providers</h2>
          <p>SeekSignal currently relies on infrastructure providers including Vercel for hosting and AI Gateway access, and Supabase for authentication and application data storage. These providers process data only as needed to provide their services.</p>
        </section>
        <section>
          <h2>Data use</h2>
          <p>We use collected information to provide and secure the service, save reports, improve product reliability, support users and understand product usage. We do not use a readiness score as proof that an AI system recommends a business.</p>
        </section>
        <section>
          <h2>Your choices</h2>
          <p>You can choose not to create an account after a free audit. Account holders can sign out and may contact SeekSignal to request access, correction or deletion of personal data where applicable. A dedicated support contact will be published before public paid launch.</p>
        </section>
      </div>
    </main>
  );
}
