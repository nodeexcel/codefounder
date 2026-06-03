import { DashboardNavbar } from "@/components/dashboard/Navbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AGENTS } from "@/lib/agents";

const agentStatus: Record<string, "active" | "inactive"> = {
  voice: "active",
  hr: "inactive",
  marketing: "inactive",
  crm: "active",
};

export default function AgentsPage() {
  return (
    <>
      <DashboardNavbar
        title="Agents"
        subtitle="Manage and configure your AI agents"
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          {AGENTS.map((agent) => {
            const status = agentStatus[agent.id];
            const isActive = status === "active";

            return (
              <Card key={agent.id} hover padding="lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#222222] text-3xl">
                      {agent.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-semibold text-white">
                          {agent.name}
                        </h3>
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            isActive
                              ? "bg-green-500/10 text-green-400"
                              : "bg-gray-500/10 text-gray-400",
                          ].join(" ")}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-gray-400">
                        {agent.description}
                      </p>
                    </div>
                  </div>
                </div>

                <ul className="mt-4 flex flex-wrap gap-2">
                  {agent.features.map((feature) => (
                    <li
                      key={feature}
                      className="rounded-md bg-black/50 px-2 py-1 text-xs text-gray-400 border border-[#222222]"
                    >
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex gap-3">
                  <Button
                    href={`/wizard?agent=${agent.id}`}
                    variant={isActive ? "secondary" : "primary"}
                  >
                    Configure
                  </Button>
                  {isActive && (
                    <Button variant="ghost" size="md">
                      View logs
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
