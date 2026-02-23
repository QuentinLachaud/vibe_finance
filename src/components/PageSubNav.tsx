import { NavLink } from 'react-router-dom';
import { PAGE_NAV_ITEMS, type PageNavItem } from '../router/navigation';

export function PageSubNav() {
  return (
    <nav className="page-sub-nav">
      {PAGE_NAV_ITEMS.map((item: PageNavItem) => (
        <NavLink
          key={item.href}
          to={item.href}
          className={({ isActive }) =>
            `sub-nav-link ${isActive ? 'sub-nav-link--active' : ''}`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
