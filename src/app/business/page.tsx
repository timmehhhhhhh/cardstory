import type { Metadata } from "next";
import { BusinessClient } from "@/app/business/_components/business-client";

export const metadata: Metadata = { title: "Business Inventory" };

export default function BusinessPage() {
  return <BusinessClient />;
}
