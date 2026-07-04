import type { Metadata } from "next";
import { MarketingHomePage } from "@/components/marketing/MarketingPages";
import { landingMetadata } from "@/lib/seo";

export const metadata: Metadata = landingMetadata;

export default function LandingPage() {
  return <MarketingHomePage />;
}
