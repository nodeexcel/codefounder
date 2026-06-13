const STATS = [
  { num: "78%", label: "of customer calls can be resolved by AI without human intervention", source: "Industry benchmark, 2025" },
  { num: "24/7", label: "availability means zero missed leads, even outside business hours", source: "CodeFounder client data" },
  { num: "60%", label: "reduction in time spent on manual scheduling & admin tasks", source: "Avg. across deployments" },
  { num: "2-4", label: "weeks average time to launch a fully trained AI agent", source: "CodeFounder delivery avg." },
];

export function Stats() {
  return (
    <section id="stats">
      <div className="stats-inner reveal">
        <div className="stats-content">
          <div className="stats-header">
            <span className="section-label">By The Numbers</span>
            <h2 className="section-title" style={{ marginBottom: 0 }}>Why SMBs are switching to AI</h2>
          </div>
          <div className="stats-grid">
            {STATS.map((s) => (
              <div key={s.num} className="stat-card">
                <div className="stat-num"><span>{s.num}</span></div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-source">— {s.source}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
