import { SITE_URL } from '../src/config/seo';
import { buildSalaryPath, POPULAR_SALARY_AMOUNTS } from '../src/utils/salaryLanding';

const CORE_PATHS = [
  '/',
  '/take-home-pay',
  '/calculator',
  '/compound-interest',
  '/net-worth',
  '/portfolio',
  '/reports',
];

export const onRequestGet: PagesFunction = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    ...CORE_PATHS.map((path) => ({ path, priority: path === '/' ? '1.0' : '0.8', changefreq: path === '/' ? 'weekly' : 'monthly' })),
    ...POPULAR_SALARY_AMOUNTS.map((amount) => ({ path: buildSalaryPath(amount), priority: '0.7', changefreq: 'weekly' })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${SITE_URL}${url.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
