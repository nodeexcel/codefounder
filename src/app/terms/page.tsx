import Link from "next/link";

export const metadata = { title: "Terms of Service — CodeFounder" };

export default function TermsPage() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e7eb", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "60px 24px 80px" }}>

        <Link href="/" style={{ color: "#f97316", textDecoration: "none", fontSize: 14 }}>
          ← Back to CodeFounder
        </Link>

        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 36, fontWeight: 800, color: "#fff", marginTop: 32, marginBottom: 6 }}>
          Terms of Service
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 40 }}>
          CodeFounder.ai (Viable Link Inc.) — Version 2.0 | Last updated June 2026
        </p>

        <div style={{ fontSize: 15, lineHeight: 1.8, color: "#d1d5db" }}>
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the CodeFounder platform and services operated by Viable Link Inc. (&ldquo;CodeFounder&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using our services you agree to these Terms.
          </p>

          <Section title="1. Acceptance of Terms">
            <p>By accessing or using CodeFounder you confirm that you are at least 18 years old, have the authority to bind yourself or your organization to these Terms, and agree to comply with them. If you do not agree, do not use our services.</p>
          </Section>

          <Section title="2. Service Description">
            <p>CodeFounder provides a SaaS platform enabling business owners to deploy and manage AI agents including Voice Agents, HR Agents, Social Media Agents, CRM Agents, and custom automation workflows. Services are delivered as defined in your selected subscription plan or agreed scope of work.</p>
          </Section>

          <Section title="3. Account Registration &amp; User Responsibilities">
            <ul>
              <li>You must provide accurate, complete, and current information when registering.</li>
              <li>You are responsible for maintaining the security and confidentiality of your login credentials.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>Notify us immediately at <a href="mailto:info@codefounder.ai" style={{ color: "#f97316" }}>info@codefounder.ai</a> if you suspect unauthorized access.</li>
              <li>You must not share accounts or allow concurrent use by multiple individuals under a single seat.</li>
            </ul>
          </Section>

          <Section title="4. Payment Terms">
            <ul>
              <li>Subscription fees are charged in advance on a monthly or annual basis as specified at checkout.</li>
              <li>All fees are in USD and exclude applicable taxes unless stated otherwise.</li>
              <li>Payments are processed by Stripe. By providing payment details you authorize recurring charges per your selected plan.</li>
              <li>If a payment fails, we may suspend access until the outstanding balance is settled.</li>
              <li>Refunds are provided at our discretion within 7 days of initial purchase. No refunds are issued for partial billing periods.</li>
              <li>We reserve the right to adjust pricing with 30 days&apos; notice to active subscribers.</li>
            </ul>
          </Section>

          <Section title="5. Prohibited Uses">
            <p>You may not use CodeFounder to:</p>
            <ul>
              <li>Transmit unlawful, deceptive, harassing, or fraudulent content.</li>
              <li>Violate any applicable law or regulation, including TCPA, GDPR, or CASL.</li>
              <li>Engage in spam, phishing, or unsolicited marketing calls.</li>
              <li>Attempt to gain unauthorized access to our systems or infrastructure.</li>
              <li>Circumvent plan limits, rate limits, or usage quotas.</li>
              <li>Resell, sublicense, or white-label our services without a separate written agreement.</li>
              <li>Interfere with or disrupt the integrity or performance of the platform.</li>
            </ul>
            <p>Violations may result in immediate account termination without refund.</p>
          </Section>

          <Section title="6. AI Input &amp; Output">
            <p>&ldquo;Input&rdquo; refers to content you provide to AI agents (prompts, data, voice, documents). &ldquo;Output&rdquo; refers to content the agents generate in response. You are responsible for the accuracy and legality of your inputs and for verifying outputs before acting on them. CodeFounder does not guarantee the accuracy of AI-generated output and is not liable for decisions made based on it.</p>
          </Section>

          <Section title="7. Intellectual Property">
            <p>CodeFounder retains all rights to its underlying software, platform, workflows, and systems. You retain ownership of your inputs and the outputs generated through your account. Any feedback, suggestions, or ideas you submit may be used by CodeFounder to improve our services without compensation or attribution.</p>
          </Section>

          <Section title="8. Reselling &amp; White-Labelling">
            <p>Reselling or white-labelling our services requires a separate written partnership agreement. Where permitted, you remain responsible for ensuring your end clients comply with equivalent obligations under these Terms. Unauthorized resale is prohibited and grounds for immediate termination.</p>
          </Section>

          <Section title="9. Third-Party Integrations">
            <p>The platform integrates with third-party services including Vapi, Twilio, Stripe, Supabase, and Google. Their respective terms and privacy policies apply to your use of those platforms. CodeFounder is not liable for failures, data loss, or issues arising from third-party services.</p>
          </Section>

          <Section title="10. Warranties &amp; Disclaimers">
            <p>CodeFounder will make reasonable efforts to maintain platform availability and quality. Except as expressly stated, the service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranty of any kind. We disclaim all implied warranties including merchantability and fitness for a particular purpose. Planned maintenance windows will be communicated in advance where possible.</p>
          </Section>

          <Section title="11. Limitation of Liability">
            <p>To the maximum extent permitted by applicable law, CodeFounder&apos;s aggregate liability for any claims arising from these Terms is limited to the fees you paid in the three months immediately preceding the claim. We are not liable for indirect, incidental, consequential, punitive, or exemplary damages, including lost profits or data loss, even if advised of the possibility.</p>
          </Section>

          <Section title="12. Termination">
            <p>Either party may terminate by providing 30 days&apos; written notice. CodeFounder may terminate or suspend your account immediately for material breach, non-payment, or violation of these Terms or our Acceptable Use Policy. Upon termination, your access will cease and any outstanding fees become immediately due. Sections 6, 7, 11, 13, and 15 survive termination.</p>
          </Section>

          <Section title="13. Confidentiality">
            <p>Both parties agree to keep confidential any non-public information received in the course of the engagement and to use it solely for the purpose for which it was shared. This obligation survives termination for a period of three years.</p>
          </Section>

          <Section title="14. Amendments">
            <p>We may update these Terms periodically. We will provide at least 14 days&apos; notice to active subscribers before material changes take effect, via email or in-app notification. Continued use after the effective date constitutes acceptance of the revised Terms.</p>
          </Section>

          <Section title="15. Governing Law">
            <p>These Terms are governed by the laws of the Province of Ontario, Canada, without regard to conflict-of-law principles. Any disputes will be resolved exclusively in the courts of Ontario.</p>
          </Section>

          <Section title="16. Contact">
            <p>
              Questions about these Terms? Contact us at{" "}
              <a href="mailto:info@codefounder.ai" style={{ color: "#f97316" }}>info@codefounder.ai</a>
              {" "}— Viable Link Inc., Kitchener, Ontario, Canada.
            </p>
          </Section>
        </div>

        <div style={{ marginTop: 56, paddingTop: 32, borderTop: "1px solid #1f2937", fontSize: 13, color: "#4b5563", display: "flex", gap: 24, flexWrap: "wrap" }}>
          <Link href="/privacy" style={{ color: "#6b7280", textDecoration: "underline" }}>Privacy Policy</Link>
          <Link href="/acceptable-use" style={{ color: "#6b7280", textDecoration: "underline" }}>Acceptable Use Policy</Link>
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
