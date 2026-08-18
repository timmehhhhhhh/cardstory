import type { Metadata } from "next";
import { ViewsClient } from "@/app/views/_components/views-client";

export const metadata: Metadata = { title: "Views" };

export default function ViewsPage() {
  return <ViewsClient />;
}
