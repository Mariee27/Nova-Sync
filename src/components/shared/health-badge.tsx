import { Activity, CheckCircle2, HeartPulse, ShieldAlert } from "lucide-react";
import type { HealthLevel } from "@/lib/selectors/health";
import { HEALTH_LABEL } from "@/lib/selectors/health";
import { Badge } from "@/components/ui/badge";

const map: Record<HealthLevel, { variant: "success" | "warning" | "danger" | "lavender"; icon: typeof Activity }> = {
  on_track: { variant: "success", icon: HeartPulse },
  at_risk: { variant: "warning", icon: Activity },
  critical: { variant: "danger", icon: ShieldAlert },
  completed: { variant: "lavender", icon: CheckCircle2 },
};

export function HealthBadge({ level, className }: { level: HealthLevel; className?: string }) {
  const { variant, icon: Icon } = map[level];
  return (
    <Badge variant={variant} className={className}>
      <Icon />
      {HEALTH_LABEL[level]}
    </Badge>
  );
}

export const HEALTH_COLOR: Record<HealthLevel, string> = {
  on_track: "#10B981",
  at_risk: "#F59E0B",
  critical: "#E11D48",
  completed: "#8B5CF6",
};
