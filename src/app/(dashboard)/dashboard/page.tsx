import { DashboardNavbar } from "@/components/dashboard/Navbar";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AGENTS } from "@/lib/agents";

const activeAgents = [
  { ...AGENTS[0], status: "active" as const, callsToday: 12 },
  { ...AGENTS[3], status: "active" as const, callsToday: 0 },
];

const recentCalls = [
  {
    id: "1",
    caller: "+1 (555) 234-8901",
    duration: "4:32",
    outcome: "Appointment booked",
    time: "12 min ago",
  },
  {
    id: "2",
    caller: "+1 (555) 891-2200",
    duration: "2:15",
    outcome: "FAQ answered",
    time: "1 hr ago",
  },
  {
    id: "3",
    caller: "+1 (555) 102-3344",
    duration: "6:01",
    outcome: "Transferred to human",
    time: "3 hrs ago",
  },
];

const usageStats = [
  { label: "Calls this month", value: "148", limit: "500", pct: 30 },
  { label: "AI minutes used", value: "6.2h", limit: "20h", pct: 31 },
  { label: "Leads captured", value: "34", limit: "—", pct: null },
];

export default function DashboardPage() {
  return (
    <>
      <DashboardNavbar
        title="Dashboard"
        subtitle="Overview of your AI agents and activity"
      />

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <WelcomeBanner />

        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-3">
          {usageStats.map((stat) => (
            <Card key={stat.label} padding="md">
              <p className="text-sm text-gray-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
              {stat.limit !== "—" && (
                <div className="mt-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#222222]">
                    <div
                      className="h-full rounded-full bg-[#f97316]"
                      style={{ width: `${stat.pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {stat.pct}% of {stat.limit} plan limit
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Active agents */}
          <Card padding="md">
            <CardHeader
              title="Active agents"
              description="Agents currently live on your account"
              action={
                <Button href="/agents" variant="ghost" size="sm">
                  View all
                </Button>
              }
            />
            <ul className="space-y-3">
              {activeAgents.map((agent) => (
                <li
                  key={agent.id}
                  className="flex items-center justify-between rounded-lg border border-[#222222] bg-black/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{agent.icon}</span>
                    <div>
                      <p className="font-medium text-white">{agent.name}</p>
                      <p className="text-xs text-gray-500">
                        {agent.id === "voice"
                          ? `${agent.callsToday} calls today`
                          : "Running"}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                    Active
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <Button href="/wizard" variant="outline" size="sm" fullWidth>
                + Launch another agent
              </Button>
            </div>
          </Card>

          {/* Recent call logs */}
          <Card padding="md">
            <CardHeader
              title="Recent call logs"
              description="Latest Voice Agent activity"
            />
            <ul className="divide-y divide-[#222222]">
              {recentCalls.map((call) => (
                <li
                  key={call.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-white">{call.caller}</p>
                    <p className="text-sm text-gray-400">{call.outcome}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-gray-300">{call.duration}</p>
                    <p className="text-gray-500">{call.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Quick actions */}
        <Card padding="md" className="bg-gradient-to-r from-[#111111] to-[#1a1008]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Ready to launch another agent?
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                Complete the setup wizard in under 10 minutes.
              </p>
            </div>
            <Button href="/wizard">Start wizard</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
