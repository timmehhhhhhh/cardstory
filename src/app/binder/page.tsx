import type { Metadata } from "next";
import { BinderClient } from "@/app/binder/_components/binder-client";

export const metadata: Metadata = { title: "Binder Planner" };

export default function BinderPage() {
  return <BinderClient />;
}
