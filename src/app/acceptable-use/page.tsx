import Link from "next/link";

export const metadata = { title: "Acceptable Use Policy — CodeFounder" };

export default function AcceptableUsePage() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e7eb", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "60px 24px 80px" }}>

        <Link href="/" style={{ color: "#f97316", textDecoration: "none", fontSize: 14 }}>
          ← Back to CodeFounder
        </Link>

        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 36, fontWeight: 800, color: "#fff", marginTop: 32, marginBottom: 6 }}>
          Acceptable Use Policy
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 40 }}>
          CodeFounder.ai (Viable Link Inc.) — Last updated June 2026
        </p>

        <div style={{ fontSize: 15, lineHeight: 1.8, color: "#d1d5db" }}>
          <p>
            This Acceptable Use Policy (&ldquo;AUP&rdquo;) sets out the rules for using the CodeFounder platform and AI agents. It applies to all users and supplements our <Link href="/terms" style={{ color: "#f97316" }}>Terms of Service</Link>. Violation of this policy may result in suspension or termination of your account.
          </p>

          <Section title="1. Permitted Uses">
            <p>You may use CodeFounder to:</p>
            <ul>
              <li>Deploy AI voice agents for legitimate business purposes — appointment booking, lead qualification, customer support, intake forms, and similar workflows.</li>
              <li>Automate internal HR, onboarding, or administrative processes for your own organization.</li>
              <li>Manage social media presence and customer communications on behalf of your business.</li>
              <li>Integrate with your existing CRM, calendar, or business tools via supported connectors.</li>
              <li>Build and test automation workflows in a development or staging environment.</li>
            </ul>
            <p>All use must be lawful, ethical, and consistent with the spirit of these rules.</p>
          </Section>

          <Section title="2. Prohibited Activities">
            <p>The following uses are strictly prohibited:</p>
            <ul>
              <li><strong>Illegal content:</strong> Generating, transmitting, or storing content that violates any law, including content that is defamatory, obscene, or infringes third-party intellectual property rights.</li>
              <li><strong>Fraud &amp; deception:</strong> Using AI agents to impersonate individuals, misrepresent your identity or affiliation, or deceive callers about the nature of the interaction in a materially harmful way.</li>
              <li><strong>Spam &amp; harassment:</strong> Sending unsolicited bulk communications, operating robocall campaigns without proper consent, or using agents to harass individuals.</li>
              <li><strong>Regulatory violations:</strong> Operating voice or messaging campaigns in violation of TCPA, CRTC, GDPR, CASL, or other applicable telemarketing and privacy regulations.</li>
              <li><strong>Security abuse:</strong> Attempting to probe, scan, or exploit vulnerabilities in our platform, or using CodeFounder as a vector to attack third-party systems.</li>
              <li><strong>Platform circumvention:</strong> Using technical means to bypass usage limits, quotas, authentication, or billing controls.</li>
              <li><strong>Malware &amp; exploits:</strong> Uploading or transmitting malicious code, scripts, or files through any part of the platform.</li>
              <li><strong>Unauthorized resale:</strong> Offering CodeFounder-powered services to paying end-customers without an explicit written reseller agreement.</li>
              <li><strong>High-risk decisions:</strong> Using AI outputs — without independent human review — to make decisions with significant legal, medical, financial, or safety consequences for individuals.</li>
            </ul>
          </Section>

          <Section title="3. AI Agent Usage Rules">
            <p>When deploying AI voice or chat agents through CodeFounder:</p>
            <ul>
              <li><strong>Disclosure:</strong> You must not configure agents to deny being an AI when a caller sincerely asks whether they are speaking with a human or a bot.</li>
              <li><strong>Consent:</strong> You are responsible for obtaining any legally required consent before recording calls or collecting personal data from callers.</li>
              <li><strong>Do Not Call compliance:</strong> You must respect applicable Do Not Call registries and honor opt-out requests promptly.</li>
              <li><strong>Data minimization:</strong> Configure agents to collect only the personal information necessary for the stated purpose.</li>
              <li><strong>Vulnerable users:</strong> Do not deploy agents in contexts designed to exploit minors, elderly individuals, or people in crisis without appropriate safeguards.</li>
              <li><strong>Accuracy:</strong> Do not design agent scripts to make false claims about products, services, pricing, or credentials.</li>
              <li><strong>Human escalation:</strong> Where reasonably practicable, agents should provide a path for callers to reach a human if needed.</li>
            </ul>
          </Section>

          <Section title="4. Content Standards">
            <p>Content you input into the platform (scripts, prompts, uploaded documents) must not:</p>
            <ul>
              <li>Contain hate speech, threats, or content that discriminates on the basis of race, gender, religion, nationality, sexual orientation, disability, or other protected characteristics.</li>
              <li>Promote violence, self-harm, or dangerous activities.</li>
              <li>Include personal data of third parties without their knowledge and appropriate legal basis.</li>
              <li>Infringe the copyright, trademark, or other intellectual property rights of any party.</li>
            </ul>
          </Section>

          <Section title="5. Monitoring &amp; Enforcement">
            <p>CodeFounder reserves the right to monitor platform usage for compliance with this AUP. We may investigate complaints or reports of violations. If we determine a violation has occurred, we may take any of the following actions:</p>
            <ul>
              <li>Issue a warning and require remediation within a specified timeframe.</li>
              <li>Suspend the relevant agent, feature, or account temporarily.</li>
              <li>Terminate the account immediately without refund for serious or repeat violations.</li>
              <li>Report the activity to law enforcement where required or appropriate.</li>
            </ul>
          </Section>

          <Section title="6. Consequences of Violation">
            <p>Violations of this AUP may result in:</p>
            <ul>
              <li>Immediate suspension or termination of your account.</li>
              <li>Forfeiture of any prepaid subscription fees.</li>
              <li>Legal action where CodeFounder suffers damages as a result of your violation.</li>
              <li>Referral to relevant regulatory authorities.</li>
            </ul>
            <p>CodeFounder&apos;s decision regarding violations is final, though you may appeal by contacting us within 14 days at <a href="mailto:info@codefounder.ai" style={{ color: "#f97316" }}>info@codefounder.ai</a>.</p>
          </Section>

          <Section title="7. Reporting Violations">
            <p>
              If you become aware of a potential violation of this AUP, please report it to us at{" "}
              <a href="mailto:info@codefounder.ai" style={{ color: "#f97316" }}>info@codefounder.ai</a>.
              {" "}We take all reports seriously and will investigate promptly.
            </p>
          </Section>

          <Section title="8. Updates to This Policy">
            <p>We may update this AUP from time to time to reflect changes in our platform, applicable law, or best practices. We will notify active users of material changes with at least 14 days&apos; notice. Continued use of the platform after the effective date constitutes acceptance.</p>
          </Section>

          <Section title="9. Contact">
            <p>
              Questions about this policy? Contact us at{" "}
              <a href="mailto:info@codefounder.ai" style={{ color: "#f97316" }}>info@codefounder.ai</a>
              {" "}— Viable Link Inc., Kitchener, Ontario, Canada.
            </p>
          </Section>
        </div>

        <div style={{ marginTop: 56, paddingTop: 32, borderTop: "1px solid #1f2937", fontSize: 13, color: "#4b5563", display: "flex", gap: 24, flexWrap: "wrap" }}>
          <Link href="/privacy" style={{ color: "#6b7280", textDecoration: "underline" }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: "#6b7280", textDecoration: "underline" }}>Terms of Service</Link>
          <Link href="/" style={{ color: "#6b7280", textDecoration: "underline" }}>Home</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
