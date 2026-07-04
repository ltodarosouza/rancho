import type { Metadata } from "next";
import { MarketingHomePage } from "@/components/marketing/MarketingPages";
import { RecoveryRedirect } from "@/app/recovery-redirect";
import { landingMetadata } from "@/lib/seo";

export const metadata: Metadata = landingMetadata;

export default function Home() {
  return (
    <>
      <RecoveryRedirect />
      <MarketingHomePage />
    </>
  );
}
