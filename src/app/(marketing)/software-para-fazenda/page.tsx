import { MarketingSolutionPage } from "@/components/marketing/MarketingPages";
import { marketingMetadataFor, marketingPageBySlug } from "@/lib/marketing-content";

const page = marketingPageBySlug("software-para-fazenda")!;

export const metadata = marketingMetadataFor(page);

export default function SoftwareParaFazendaPage() {
  return <MarketingSolutionPage page={page} />;
}
