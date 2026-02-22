import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../router/navigation';

export function PageSubNav() {
  return (
    <nav className="page-sub-nav">
      {NAV_ITEMS.map((item: { path: string; label: string }) => (
        <NavLink
          key={item.path}
          to={item.path}
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
