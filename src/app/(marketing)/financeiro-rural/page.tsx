import { MarketingSolutionPage } from "@/components/marketing/MarketingPages";
import { marketingMetadataFor, marketingPageBySlug } from "@/lib/marketing-content";

const page = marketingPageBySlug("financeiro-rural")!;

export const metadata = marketingMetadataFor(page);

export default function FinanceiroRuralPage() {
  return <MarketingSolutionPage page={page} />;
}
