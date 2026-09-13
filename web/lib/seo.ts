import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, absoluteUrl } from "./site";

const SHARE_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Arbor — parametric CAD, native ECAD, zero cloud",
} as const;

export function pageMeta({
  title,
  description,
  path,
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: true },
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_US",
      type: "website",
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SHARE_IMAGE.url],
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function siteJsonLd() {
  const logo = `${SITE_URL}/icon.svg`;
  const image = `${SITE_URL}/og.png`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        description:
          "Open-source local-first desktop CAD, CAM, and ECAD. OpenCASCADE solids, SQLite versioning, Gerber out.",
        inLanguage: "en-US",
        publisher: { "@id": `${SITE_URL}/#org` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#org`,
        name: "Arbor Contributors",
        url: `${SITE_URL}/`,
        logo: { "@type": "ImageObject", url: logo },
        sameAs: ["https://github.com/Eerielettuce3717/arbor-cae"],
        email: "varun.m.ganti@gmail.com",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        applicationCategory: "DesignApplication",
        applicationSubCategory: "CAD",
        operatingSystem: "macOS, Windows, Linux",
        license: "https://opensource.org/licenses/MIT",
        url: `${SITE_URL}/`,
        image,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        author: { "@id": `${SITE_URL}/#org` },
        codeRepository: "https://github.com/Eerielettuce3717/arbor-cae",
        downloadUrl: `${SITE_URL}/download/`,
      },
      {
        "@type": ["LocalBusiness", "ProfessionalService"],
        "@id": `${SITE_URL}/#business`,
        name: "Arbor",
        url: `${SITE_URL}/`,
        image,
        logo,
        priceRange: "Free",
        currenciesAccepted: "USD",
        paymentAccepted: "None — MIT licensed software",
        areaServed: {
          "@type": "Place",
          name: "Worldwide",
        },
        address: {
          "@type": "PostalAddress",
          addressRegion: "CA",
          addressCountry: "US",
        },
        parentOrganization: { "@id": `${SITE_URL}/#org` },
        sameAs: ["https://github.com/Eerielettuce3717/arbor-cae"],
      },
    ],
  };
}
