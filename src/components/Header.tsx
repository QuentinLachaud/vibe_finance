import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { NAV_ITEMS } from '../router/navigation';
import { LoginModal } from './LoginModal';
import type { User } from 'firebase/auth';


function UserMenu({ user, onClose, onSignOut }: { user: User; onClose: () => void; onSignOut: () => void }) {
  const handleSignOut = async () => {
    await onSignOut();
    onClose();
  };


  return (
    <div className="user-menu">
      <div className="user-menu-name">{user.displayName || 'User'}</div>
      <div className="user-menu-email">{user.email}</div>
      <NavLink to="/settings" className="user-menu-settings-link" onClick={onClose}>
        Settings
      </NavLink>
      <button className="user-menu-signout" onClick={handleSignOut}>
        Sign out
      </button>
    </div>
  );
}


export function Header() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (!showMenu) return;
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);


  return (
    <header className="app-header">
      <div className="header-inner">
        <Link to="/" className="header-logo" aria-label="TakeHomeCalc.co.uk home">
          <span className="logo-text">TakeHomeCalc<span className="logo-tld">.co.uk</span></span>
        </Link>


        <nav className="header-nav header-nav--desktop" aria-label="Primary navigation">
          {NAV_ITEMS.filter((item) => !item.isSettings).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>


        <div className="header-controls">
          {!loading && (
            user ? (
              <div className="user-avatar-wrapper" ref={menuRef}>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="user-avatar"
                    onClick={() => setShowMenu((open) => !open)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <button
                    className="auth-btn"
                    onClick={() => setShowMenu((open) => !open)}
                    aria-label="Open account menu"
                    aria-expanded={showMenu}
                  >
                    {(user.displayName || user.email || 'U').charAt(0)}
                  </button>
                )}
                {showMenu && (
                  <UserMenu
                    user={user}
                    onClose={() => setShowMenu(false)}
                    onSignOut={async () => {
                      await logout();
                      navigate('/');
                    }}
                  />
                )}
              </div>
            ) : (
              <button className="auth-btn" onClick={() => setShowLogin(true)}>
                Sign in
              </button>
            )
          )}
        </div>
      </div>


      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </header>
  );
}
