interface Industry {
  label: string;
  icon: React.ReactNode;
}

const INDUSTRIES: Industry[] = [
  {
    label: "Healthcare & Clinics",
    icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path stroke="currentColor" d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z" /></svg>,
  },
  {
    label: "Real Estate",
    icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path stroke="currentColor" d="M3 9.5 12 2l9 7.5" /><path stroke="currentColor" d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" /></svg>,
  },
  {
    label: "Legal Services",
    icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path stroke="currentColor" d="M12 3v18" /><path stroke="currentColor" d="M5 7h14" /><path stroke="currentColor" d="M5 7l-3 7a3 3 0 0 0 6 0z" /><path stroke="currentColor" d="M19 7l-3 7a3 3 0 0 0 6 0z" /></svg>,
  },
  {
    label: "Home Services",
    icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path stroke="currentColor" d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-3-3z" /></svg>,
  },
  {
    label: "Salons & Spas",
    icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><circle stroke="currentColor" cx={6} cy={6} r={3} /><circle stroke="currentColor" cx={6} cy={18} r={3} /><line stroke="currentColor" x1={20} y1={4} x2={8.12} y2={15.88} /><line stroke="currentColor" x1={14.47} y1={14.48} x2={20} y2={20} /><line stroke="currentColor" x1={8.12} y1={8.12} x2={12} y2={12} /></svg>,
  },
  {
    label: "Restaurants",
    icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path stroke="currentColor" d="M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2" /><path stroke="currentColor" d="M7 2v20" /><path stroke="currentColor" d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" /></svg>,
  },
  {
    label: "Automotive",
    icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><rect stroke="currentColor" x={1} y={3} width={15} height={13} /><polygon stroke="currentColor" points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle stroke="currentColor" cx={5.5} cy={18.5} r={2.5} /><circle stroke="currentColor" cx={18.5} cy={18.5} r={2.5} /></svg>,
  },
  {
    label: "Professional Services",
    icon: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path stroke="currentColor" d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline stroke="currentColor" points="3.27 6.96 12 12.01 20.73 6.96" /><line stroke="currentColor" x1={12} y1={22.08} x2={12} y2={12} /></svg>,
  },
];

export function Industries() {
  return (
    <section id="industries">
      <div className="ind-hdr reveal">
        <span className="section-label">Who We Serve</span>
        <h2 className="section-title">Built for service-based businesses</h2>
        <p className="section-sub" style={{ margin: "0 auto" }}>
          Wherever customers call, message, or book — our AI agents fit right in.
        </p>
      </div>
      <div className="ind-scroll">
        {[...INDUSTRIES, ...INDUSTRIES].map(({ label, icon }, i) => (
          <span key={i} className="ind-chip">
            <span className="ind-ico">{icon}</span> {label}
          </span>
        ))}
      </div>
    </section>
  );
}
