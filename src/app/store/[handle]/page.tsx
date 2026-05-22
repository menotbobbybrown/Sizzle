import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { cache } from "@/lib/cache";
import { unstable_cache } from "next/cache";
import { RecentSalesTicker } from "@/components/storefront/RecentSalesTicker";
import { 
  Instagram, 
  Youtube, 
  Globe, 
  ArrowRight, 
  Download, 
  Video, 
  Users,
  ExternalLink
} from "lucide-react";

export const revalidate = 60;

type Props = {
  params: Promise<{ handle: string }>;
};

// Local Helpers
function formatPrice(price: any, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(price));
}

function formatFollowers(count: number) {
  if (count >= 1000000) return (count / 1000000).toFixed(1) + "M";
  if (count >= 1000) return (count / 1000).toFixed(1) + "K";
  return count.toString();
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getSocialUrl(platform: string, username: string) {
  switch (platform) {
    case "TIKTOK": return `https://tiktok.com/@${username}`;
    case "INSTAGRAM": return `https://instagram.com/${username}`;
    case "YOUTUBE": return `https://youtube.com/@${username}`;
    default: return "#";
  }
}

async function getStorefrontData(handle: string) {
  const cached = await cache.getCachedStorefront(handle);
  if (cached) return cached as any;

  const data = await unstable_cache(
    async () => {
      return db.workspace.findUnique({
        where: { handle },
        include: {
          storefront: true,
          products: {
            where: { status: "PUBLISHED" },
            orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
          },
          socialConnections: {
            where: { status: "CONNECTED" },
          },
        },
      });
    },
    [`storefront-db-${handle}`],
    {
      tags: [`storefront-${handle}`],
      revalidate: 60,
    }
  )();

  if (data) {
    await cache.setCachedStorefront(handle, data);
  }

  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const workspace = await getStorefrontData(handle);

  if (!workspace) return { title: "Store Not Found" };

  return {
    title: `${workspace.name} (@${workspace.handle}) | Sizzle`,
    description: workspace.bio || `Check out ${workspace.name}'s products on Sizzle.`,
    openGraph: {
      title: workspace.name,
      description: workspace.bio || "",
      images: workspace.logoUrl ? [workspace.logoUrl] : [],
    },
  };
}

export default async function StorePage({ params }: Props) {
  const { handle } = await params;
  const workspace = await getStorefrontData(handle);

  if (!workspace) {
    notFound();
  }

  const theme = (workspace.storefront?.config as any) || {};
  const primaryColor = theme.primaryColor || "#000000";
  const accentColor = theme.accentColor || "#f59e0b";
  const fontFamily = theme.fontFamily || "sans";
  const layout = theme.layout || "grid";

  const featuredProduct = workspace.products.find((p: any) => p.featured);
  const otherProducts = workspace.products.filter((p: any) => !p.featured || workspace.products.length === 1);

  return (
    <div 
      className={`min-h-screen bg-white font-${fontFamily}`}
      style={{ "--primary": primaryColor, "--accent": accentColor } as any}
    >
      {/* Banner */}
      {workspace.bannerUrl && (
        <div className="w-full h-48 md:h-64 overflow-hidden">
          <img 
            src={workspace.bannerUrl} 
            alt="Banner" 
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 pb-24">
        {/* Hero Section */}
        <div className={`relative ${workspace.bannerUrl ? "-mt-16" : "pt-12"} mb-12 flex flex-col items-center text-center`}>
          <div className="w-32 h-32 rounded-2xl border-4 border-white bg-zinc-100 overflow-hidden shadow-lg mb-6">
            {workspace.logoUrl ? (
              <img src={workspace.logoUrl} alt={workspace.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white text-3xl font-bold">
                {workspace.name.charAt(0)}
              </div>
            )}
          </div>
          
          <h1 className="text-3xl font-bold text-zinc-900 mb-1">{workspace.name}</h1>
          <p className="text-zinc-500 font-medium mb-4">@{workspace.handle}</p>
          
          {workspace.bio && (
            <p className="max-w-2xl text-zinc-600 mb-6 leading-relaxed">
              {workspace.bio}
            </p>
          )}

          {/* Social Links */}
          <div className="flex flex-wrap justify-center gap-3">
            {workspace.socialConnections.map((social: any) => (
              <a
                key={social.id}
                href={getSocialUrl(social.platform, social.platformUsername)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-full text-sm font-medium text-zinc-700 transition-colors"
              >
                {social.platform === "INSTAGRAM" && <Instagram className="w-4 h-4" />}
                {social.platform === "YOUTUBE" && <Youtube className="w-4 h-4" />}
                {/* Fallback for TikTok/others */}
                {social.platform === "TIKTOK" && (
                   <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                     <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.03 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.89-.23-2.74.22-.69.37-1.24.99-1.53 1.7-.27.64-.26 1.37-.1 2.06.21.94.8 1.78 1.57 2.33.77.54 1.73.77 2.68.64 1.2-.16 2.24-.89 2.81-1.93.31-.56.44-1.2.45-1.83-.01-2.87-.01-5.73-.01-8.6z"/>
                   </svg>
                )}
                <span>{social.platformUsername}</span>
                {social.subscriberCount && (
                  <span className="text-zinc-400 font-normal ml-1">
                    {formatFollowers(social.subscriberCount)}
                  </span>
                )}
              </a>
            ))}
            {workspace.domain && (
              <a
                href={`https://${workspace.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-full text-sm font-medium text-zinc-700 transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span>Website</span>
              </a>
            )}
          </div>
        </div>

        {/* Recent Sales Ticker */}
        <div className="flex justify-center mb-16">
          <RecentSalesTicker workspaceId={workspace.id} />
        </div>

        {/* Featured Product */}
        {featuredProduct && (
          <section className="mb-20">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-px flex-1 bg-zinc-100" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 px-4">Featured Product</h2>
              <div className="h-px flex-1 bg-zinc-100" />
            </div>
            
            <Link 
              href={`/@${handle}/p/${featuredProduct.slug}`}
              className="group block bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl hover:shadow-black/20 transition-all duration-500"
            >
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="aspect-square md:aspect-auto h-full overflow-hidden">
                  {featuredProduct.imageUrl ? (
                    <img 
                      src={featuredProduct.imageUrl} 
                      alt={featuredProduct.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-700">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-8 md:p-12 flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 text-amber-400 text-sm font-bold uppercase tracking-widest mb-4">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Best Seller
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 group-hover:text-amber-400 transition-colors">
                    {featuredProduct.name}
                  </h3>
                  <p className="text-zinc-400 text-lg mb-8 line-clamp-3 leading-relaxed">
                    {featuredProduct.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-white">
                      {formatPrice(featuredProduct.price, featuredProduct.currency)}
                    </div>
                    <div className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-bold group-hover:bg-amber-400 transition-colors">
                      Get Access
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Product Listing */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-zinc-900">All Products</h2>
            <div className="text-sm text-zinc-500 font-medium">
              {otherProducts.length} items
            </div>
          </div>

          <div className={layout === "list" ? "space-y-4" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"}>
            {otherProducts.map((product: any) => (
              <Link
                key={product.id}
                href={`/@${handle}/p/${product.slug}`}
                className={`group bg-white border border-zinc-100 rounded-2xl overflow-hidden hover:border-zinc-200 hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300 ${
                  layout === "list" ? "flex items-center gap-6 p-4" : "flex flex-col"
                }`}
              >
                <div className={layout === "list" ? "w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden" : "aspect-[4/3] overflow-hidden"}>
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-50 flex items-center justify-center text-zinc-300">
                      No image
                    </div>
                  )}
                </div>
                
                <div className={`p-6 ${layout === "list" ? "flex-1 p-0" : ""}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-zinc-900 group-hover:text-amber-600 transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                  </div>
                  
                  {layout !== "list" && (
                    <p className="text-sm text-zinc-500 mb-6 line-clamp-2 min-h-[2.5rem]">
                      {product.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="font-bold text-zinc-900">
                      {formatPrice(product.price, product.currency)}
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 group-hover:text-zinc-900 transition-colors">
                      {product.type === "DIGITAL" && (
                        <>
                          <Download className="w-3 h-3" />
                          {product.fileSize ? formatFileSize(product.fileSize) : "Download"}
                        </>
                      )}
                      {product.type === "COURSE" && (
                        <>
                          <Video className="w-3 h-3" />
                          Course
                        </>
                      )}
                      {product.type === "MEMBERSHIP" && (
                        <>
                          <Users className="w-3 h-3" />
                          Join
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {workspace.products.length === 0 && (
            <div className="text-center py-24 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-100">
              <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-zinc-300" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-1">No products yet</h3>
              <p className="text-zinc-500">Check back soon for new digital goods!</p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-12">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white font-bold text-xs">
              {workspace.name.charAt(0)}
            </div>
            <span className="font-bold text-zinc-900">{workspace.name}</span>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-zinc-400">
            <Link href="/terms" className="hover:text-zinc-900 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-zinc-900 transition-colors">Privacy</Link>
            <a href="mailto:support@sizzle.com" className="hover:text-zinc-900 transition-colors">Support</a>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span>Powered by</span>
            <Link href="/" className="font-bold text-zinc-900 flex items-center gap-1 hover:text-amber-600 transition-colors">
              Sizzle
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
