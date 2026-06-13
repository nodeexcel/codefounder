import Link from "next/link";

export function CTA() {
  return (
    <section id="cta">
      <div className="cta-inner reveal">
        <div className="cta-orb cta-orb-1" />
        <div className="cta-orb cta-orb-2" />
        <div className="cta-content">
          <span className="tag">Get Started Today</span>
          <h2 style={{ marginTop: 18 }}>Ready to give your business a voice?</h2>
          <p>
            Book a free strategy call and we&apos;ll show you exactly where AI can save you time,
            capture more leads, and cut operating costs — no commitment required.
          </p>
          <div className="cta-actions">
            <Link href="/signup" className="btn-primary">Start Free Trial →</Link>
            <a href="#faq" className="btn-outline">View FAQs</a>
          </div>
        </div>
      </div>
    </section>
  );
}
