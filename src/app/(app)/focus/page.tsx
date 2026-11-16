import type { Metadata } from "next";
import { FocusView } from "@/components/focus/focus-view";

export const metadata: Metadata = { title: "Focus Mode" };

export default function Page() {
  return <FocusView />;
}
