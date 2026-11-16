import type { Metadata } from "next";
import { RecapView } from "@/components/recap/recap-view";

export const metadata: Metadata = { title: "Weekly Recap" };

export default function Page() {
  return <RecapView />;
}
