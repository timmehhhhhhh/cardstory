import type { Metadata } from "next";
import { BusinessBinderClient } from "@/app/business/binder/_components/business-binder-client";

export const metadata: Metadata = { title: "Business Inventory Binder" };

export default function BusinessBinderPage() {
  return <BusinessBinderClient />;
}
