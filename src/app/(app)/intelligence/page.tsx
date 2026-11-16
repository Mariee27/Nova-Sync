import type { Metadata } from "next";
import { IntelligenceView } from "@/components/intelligence/intelligence-view";

export const metadata: Metadata = { title: "Sync Intelligence" };

export default function Page() {
  return <IntelligenceView />;
}
