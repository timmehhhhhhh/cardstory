import type { Metadata } from "next";
import { BusinessBinderClient } from "@/app/business/binder/_components/business-binder-client";

export const metadata: Metadata = { title: "Business Binder Planner" };

export default function BusinessBinderPage() {
  return <BusinessBinderClient />;
}
