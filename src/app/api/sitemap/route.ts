import { db } from "@/lib/db";
import { env } from "@/env";

// The Next config rewrites `/sitemap.xml` to this route. We build the sitemap
// from static marketing pages plus every published storefront and product.
export const revalidate = 3600; // regenerate at most hourly

function urlEntry(loc: string, lastmod?: Date): string {
  const lastmodTag = lastmod
    ? `<lastmod>${lastmod.toISOString()}</lastmod>`
    : "";
  return `<url><loc>${loc}</loc>${lastmodTag}</url>`;
}

export async function GET() {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  const staticPaths = ["/", "/pricing", "/explore"];
  const entries: string[] = staticPaths.map((p) => urlEntry(`${base}${p}`));

  try {
    const [workspaces, products] = await Promise.all([
      db.workspace.findMany({
        where: { handle: { not: "" } },
        select: { handle: true, updatedAt: true },
      }),
      db.product.findMany({
        where: { status: "PUBLISHED" },
        select: {
          slug: true,
          updatedAt: true,
          workspace: { select: { handle: true } },
        },
      }),
    ]);

    for (const ws of workspaces) {
      entries.push(urlEntry(`${base}/${ws.handle}`, ws.updatedAt));
    }
    for (const p of products) {
      entries.push(
        urlEntry(
          `${base}/store/${p.workspace.handle}/p/${p.slug}`,
          p.updatedAt
        )
      );
    }
  } catch (error) {
    // Never fail the sitemap on a DB hiccup — serve the static pages at least.
    console.error("Failed to build dynamic sitemap entries:", error);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
