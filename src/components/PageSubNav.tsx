import { NavLink } from 'react-router-dom';
import { PAGE_NAV_ITEMS } from '../router/navigation';

export function PageSubNav() {
  return (
    <nav className="page-sub-nav">
      {PAGE_NAV_ITEMS.map((item) => (
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
