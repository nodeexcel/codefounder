import Link from "next/link";

export const metadata = { title: "Refund & Cancellation Policy — CodeFounder" };

export default function RefundPage() {
  return (
    <div style={{ background: "var(--background)", minHeight: "100vh", color: "var(--foreground)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "60px 24px 80px" }}>

        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14, fontFamily: "'Outfit', sans-serif" }}>
          ← Back to CodeFounder
        </Link>

        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 36, fontWeight: 800, color: "var(--foreground)", marginTop: 32, marginBottom: 6 }}>
          Refund &amp; Cancellation Policy
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted-low)", marginBottom: 40, fontFamily: "'Outfit', sans-serif" }}>
          CodeFounder.ai (Viable Link Inc.) — Last updated June 2026
        </p>

        <div style={{ fontSize: 15, lineHeight: 1.8, color: "var(--muted)" }}>
          <p>
            We want you to feel confident using CodeFounder. Please read the following policy carefully before subscribing.
          </p>

          <Section title="1. Free Trial">
            <p>
              All paid plans include a <strong style={{ color: "var(--foreground)" }}>14-day free trial</strong>. You will not be charged during the trial period.
              You may cancel your trial at any time before it ends with no obligation and no charge. If you do not cancel
              before the trial period expires, your account will automatically convert to the selected paid plan and your
              payment method will be billed.
            </p>
          </Section>

          <Section title="2. Paid Subscriptions">
            <p>
              CodeFounder subscriptions are billed on a monthly basis. You may cancel your subscription at any time through
              your account settings or by contacting us at{" "}
              <a href="mailto:info@codefounder.ai" style={{ color: "var(--accent)" }}>info@codefounder.ai</a>.
            </p>
            <p>
              If you cancel before your next billing cycle begins, your subscription will remain active until the end of
              the current billing period, after which it will not renew. You will retain full access to your plan features
              through the end of the paid period.
            </p>
          </Section>

          <Section title="3. No Refunds on Billed Periods">
            <p>
              <strong style={{ color: "var(--foreground)" }}>All charges for completed billing periods are non-refundable.</strong>{" "}
              We do not issue pro-rated refunds or credits for unused time within a billing cycle that has already been charged.
            </p>
            <p>
              This includes but is not limited to: partial-month cancellations, plan downgrades mid-cycle, or failure to
              use the service during an active subscription period.
            </p>
          </Section>

          <Section title="4. Exceptions">
            <p>
              We may consider refund requests on a case-by-case basis in exceptional circumstances such as significant
              technical failures attributable to our platform that prevented your use of the service for an extended period.
              To submit an exception request, contact us within 7 days of the charge in question.
            </p>
          </Section>

          <Section title="5. How to Cancel">
            <ol>
              <li>Sign in to your CodeFounder account.</li>
              <li>Navigate to <strong style={{ color: "var(--foreground)" }}>Billing</strong> in your dashboard.</li>
              <li>Select <strong style={{ color: "var(--foreground)" }}>Cancel Subscription</strong> and follow the prompts.</li>
            </ol>
            <p>
              Alternatively, email{" "}
              <a href="mailto:info@codefounder.ai" style={{ color: "var(--accent)" }}>info@codefounder.ai</a>{" "}
              with your account email and we will process the cancellation for you within 1 business day.
            </p>
          </Section>

          <Section title="6. Contact Us">
            <p>
              If you have any questions about this policy or a billing concern, please reach out:{" "}
              <a href="mailto:info@codefounder.ai" style={{ color: "var(--accent)" }}>info@codefounder.ai</a>
              {" "}— Viable Link Inc., Kitchener, Ontario, Canada.
            </p>
          </Section>
        </div>

        <div style={{ marginTop: 56, paddingTop: 32, borderTop: "1px solid var(--border)", fontSize: 13, color: "var(--muted-low)", display: "flex", gap: 24, flexWrap: "wrap" }}>
          <Link href="/privacy" style={{ color: "var(--muted-low)", textDecoration: "underline" }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: "var(--muted-low)", textDecoration: "underline" }}>Terms of Service</Link>
          <Link href="/contact" style={{ color: "var(--muted-low)", textDecoration: "underline" }}>Contact</Link>
          <Link href="/" style={{ color: "var(--muted-low)", textDecoration: "underline" }}>Home</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--foreground)", marginBottom: 10 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
