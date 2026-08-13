import type { Metadata } from "next";
import { PortfolioClient } from "@/app/portfolio/_components/portfolio-client";

export const metadata: Metadata = { title: "Portfolio" };

export default function PortfolioPage() {
  return <PortfolioClient />;
}
