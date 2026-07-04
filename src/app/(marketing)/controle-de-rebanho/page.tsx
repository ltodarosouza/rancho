import { MarketingSolutionPage } from "@/components/marketing/MarketingPages";
import { marketingMetadataFor, marketingPageBySlug } from "@/lib/marketing-content";

const page = marketingPageBySlug("controle-de-rebanho")!;

export const metadata = marketingMetadataFor(page);

export default function ControleDeRebanhoPage() {
  return <MarketingSolutionPage page={page} />;
}
