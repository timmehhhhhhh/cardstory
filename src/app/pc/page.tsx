import type { Metadata } from "next";
import { PCClient } from "@/app/pc/_components/pc-client";

export const metadata: Metadata = { title: "PC" };

export default function PCPage() {
  return <PCClient />;
}
