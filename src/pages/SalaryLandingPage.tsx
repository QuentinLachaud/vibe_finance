import { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { TakeHomePayPage } from './TakeHomePayPage';

// Salaries from £30,000 to £150,000 in £2,500 increments
const VALID_SALARIES = new Set(
  Array.from({ length: (150_000 - 30_000) / 2_500 + 1 }, (_, i) => 30_000 + i * 2_500),
);

export function SalaryLandingPage() {
  const { salary: salaryParam } = useParams<{ salary: string }>();
  const salary = Number(salaryParam);
  const isValid = VALID_SALARIES.has(salary);

  useEffect(() => {
    if (!isValid) return;

    const formattedSalary = `£${salary.toLocaleString('en-GB')}`;
    const title = `${formattedSalary} Take Home Pay Calculator | TakeHomeCalc`;
    const description = `Find out exactly how much you take home on a ${formattedSalary} salary after UK income tax and National Insurance in 2025–26.`;

    const prevTitle = document.title;
    document.title = title;

    const upsertMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const upsertOgMeta = (property: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const canonicalUrl = `https://takehomecalc.co.uk/salary/${salary}`;

    upsertMeta('description', description);
    upsertOgMeta('og:title', title);
    upsertOgMeta('og:description', description);
    upsertOgMeta('og:url', canonicalUrl);
    upsertOgMeta('og:type', 'website');

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    return () => {
      document.title = prevTitle;
    };
  }, [salary, isValid]);

  if (!isValid) {
    return <Navigate to="/take-home-pay" replace />;
  }

  return <TakeHomePayPage initialSalary={salary} />;
}
