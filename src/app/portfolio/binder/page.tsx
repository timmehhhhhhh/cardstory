import type { Metadata } from "next";
import { BinderClient } from "@/app/portfolio/binder/_components/binder-client";

export const metadata: Metadata = { title: "Binder" };

export default function BinderPage() {
  return <BinderClient />;
}
