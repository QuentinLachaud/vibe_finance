import { useEffect } from 'react';
import { DEFAULT_OG_IMAGE, SITE_URL } from '../config/seo';

interface SeoMetaOptions {
  title: string;
  description: string;
  canonicalPath?: string;
  keywords?: string[];
  ogImage?: string;
  robots?: string;
}

function upsertMeta(selector: string, attributeName: 'name' | 'property', attributeValue: string, content: string) {
  let node = document.head.querySelector<HTMLMetaElement>(selector);

  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(attributeName, attributeValue);
    document.head.appendChild(node);
  }

  node.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let node = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

  if (!node) {
    node = document.createElement('link');
    node.setAttribute('rel', rel);
    document.head.appendChild(node);
  }

  node.setAttribute('href', href);
}

export function useSeoMeta({
  title,
  description,
  canonicalPath = '/',
  keywords,
  ogImage = DEFAULT_OG_IMAGE,
  robots,
}: SeoMetaOptions) {
  useEffect(() => {
    const canonicalUrl = `${SITE_URL}${canonicalPath}`;
    const imageUrl = ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`;

    document.title = title;

    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', imageUrl);
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);

    if (keywords?.length) {
      upsertMeta('meta[name="keywords"]', 'name', 'keywords', keywords.join(', '));
    }

    if (robots) {
      upsertMeta('meta[name="robots"]', 'name', 'robots', robots);
    }

    upsertLink('canonical', canonicalUrl);
  }, [canonicalPath, description, keywords, ogImage, robots, title]);
}
