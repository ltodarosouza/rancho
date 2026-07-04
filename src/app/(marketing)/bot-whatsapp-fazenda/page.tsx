import { MarketingSolutionPage } from "@/components/marketing/MarketingPages";
import { marketingMetadataFor, marketingPageBySlug } from "@/lib/marketing-content";

const page = marketingPageBySlug("bot-whatsapp-fazenda")!;

export const metadata = marketingMetadataFor(page);

export default function BotWhatsappFazendaPage() {
  return <MarketingSolutionPage page={page} />;
}
