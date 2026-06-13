const LOGOS = ["Twilio", "OpenAI", "Make.com", "Zapier", "HubSpot", "Google Cloud", "WhatsApp Business", "Calendly", "Stripe", "Slack"];

export function LogoStrip() {
  return (
    <div className="logo-strip">
      <div className="logo-strip-inner">
        {[...LOGOS, ...LOGOS].map((name, i) => (
          <span key={i} className="logo-item">
            {name}<span className="logo-div" />
          </span>
        ))}
      </div>
    </div>
  );
}
