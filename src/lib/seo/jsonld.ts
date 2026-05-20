type JsonLdProps = {
  type: "Organization" | "Product" | "Course" | "Offer";
  data: Record<string, unknown>;
};

export function jsonLd({ type, data }: JsonLdProps): string {
  const ld = {
    "@context": "https://schema.org",
    "@type": type,
    ...data,
  };
  return JSON.stringify(ld);
}

export function organizationJsonLd(
  name: string,
  url: string,
  logo?: string
): string {
  return jsonLd({
    type: "Organization",
    data: {
      name,
      url,
      ...(logo ? { logo } : {}),
    },
  });
}

export function productJsonLd(
  name: string,
  description: string,
  price: number,
  currency: string,
  url: string,
  image?: string
): string {
  return jsonLd({
    type: "Product",
    data: {
      name,
      description,
      image: image ?? undefined,
      offers: {
        "@type": "Offer",
        price: price.toString(),
        priceCurrency: currency,
        url,
        availability: "https://schema.org/InStock",
      },
    },
  });
}

export function courseJsonLd(
  name: string,
  description: string,
  providerName: string,
  url: string,
  image?: string
): string {
  return jsonLd({
    type: "Course",
    data: {
      name,
      description,
      provider: {
        "@type": "Organization",
        name: providerName,
      },
      ...(image ? { image } : {}),
      url,
    },
  });
}