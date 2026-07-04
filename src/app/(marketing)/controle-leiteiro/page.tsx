import { MarketingSolutionPage } from "@/components/marketing/MarketingPages";
import { marketingMetadataFor, marketingPageBySlug } from "@/lib/marketing-content";

const page = marketingPageBySlug("controle-leiteiro")!;

export const metadata = marketingMetadataFor(page);

export default function ControleLeiteiroPage() {
  return <MarketingSolutionPage page={page} />;
}
