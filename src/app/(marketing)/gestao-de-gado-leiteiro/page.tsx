import { MarketingSolutionPage } from "@/components/marketing/MarketingPages";
import { marketingMetadataFor, marketingPageBySlug } from "@/lib/marketing-content";

const page = marketingPageBySlug("gestao-de-gado-leiteiro")!;

export const metadata = marketingMetadataFor(page);

export default function GestaoDeGadoLeiteiroPage() {
  return <MarketingSolutionPage page={page} />;
}
