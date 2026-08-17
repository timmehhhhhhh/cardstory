import type { Metadata } from "next";
import { BinderClient } from "@/app/pc/binder/_components/binder-client";

export const metadata: Metadata = { title: "Binder" };

export default function BinderPage() {
  return <BinderClient />;
}
