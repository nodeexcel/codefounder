import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer>
      <div className="ft-inner">
        <div className="ft-top">
          <div className="ft-brand">
            <div className="ft-brand-logo">
              <span className="nav-bm-wrap">
                <Image src="/Brandmark.png" alt="CodeFounder" width={34} height={34} />
              </span>
              <span className="nav-logo-text">
                <span className="nav-logo-code">Code</span>
                <span className="nav-logo-founder">Founder</span>
              </span>
            </div>
            <p>
              AI voice agents and workflow automation for SMBs across Canada and the UK.
              Stop running on manual — start running on AI.
            </p>
            <div className="ft-social">
              <a href="https://www.linkedin.com/company/codefounder-ai/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="ft-social-link" aria-label="LinkedIn">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z" />
                </svg>
              </a>
              <a href="https://www.facebook.com/profile.php?id=61590600142105" target="_blank" rel="noopener noreferrer" className="ft-social-link" aria-label="Facebook">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.16 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.91h-2.33V22c4.78-.78 8.44-4.94 8.44-9.94z" />
                </svg>
              </a>
              <a href="https://www.instagram.com/codefounder.ai" target="_blank" rel="noopener noreferrer" className="ft-social-link" aria-label="Instagram">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                  <rect x={2} y={2} width={20} height={20} rx={5} />
                  <circle cx={12} cy={12} r={4} />
                  <circle cx={17.5} cy={6.5} r={0.6} fill="currentColor" stroke="none" />
                </svg>
              </a>
            </div>
          </div>

          <div className="ft-col">
            <h4>Services</h4>
            <a href="#services">AI Voice Agent</a>
            <a href="#services">AI Receptionist</a>
            <a href="#services">AI Answering Service</a>
            <a href="#services">WhatsApp Integration</a>
          </div>

          <div className="ft-col">
            <h4>Company</h4>
            <a href="#about">About Us</a>
            <a href="#process">How It Works</a>
            <a href="#projects">Case Studies</a>
            <a href="#faq">FAQ</a>
          </div>

          <div className="ft-col">
            <h4>Get Started</h4>
            <Link href="/signup">Sign Up Free</Link>
            <Link href="/login">Sign In</Link>
            <Link href="/contact">Contact Us</Link>
          </div>

          <div className="ft-col">
            <h4>Legal</h4>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/refund">Refund Policy</Link>
            <Link href="/acceptable-use">Acceptable Use</Link>
          </div>
        </div>

        <div className="ft-bottom">
          <span>&copy; {new Date().getFullYear()} CodeFounder. All rights reserved.</span>
          <div className="ft-legal">
            <Link href="/contact">Contact</Link>
            <Link href="/refund">Refund Policy</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/acceptable-use">Acceptable Use</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
