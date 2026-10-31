import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { navItemsFor, ROLE_LABEL } from '../utils/navLinks';
import { CloseIcon, LogoMark, LogoutIcon, MenuIcon } from './ui/icons';

// Active page: bold + underlined (not colour alone). NavLink also sets
// aria-current="page" for screen readers.
const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100 hover:text-slate-900 ${
    isActive
      ? 'font-semibold text-brand-800 underline decoration-2 underline-offset-8'
      : 'text-slate-700'
  }`;

function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const items = navItemsFor(user?.role);

  function handleLogout() {
    logout();
    setOpen(false);
    navigate('/');
  }

  // Close the mobile menu when the page changes, and on Escape.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <Link to="/" className="flex items-center gap-2 rounded-md py-1 text-lg font-bold text-slate-900">
          <LogoMark />
          <span>CleanConnect</span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={linkClass}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Desktop account area */}
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <span className="text-sm text-slate-700">
                <span className="font-medium">{user.name}</span>
                <span className="ml-1.5 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">
                  {ROLE_LABEL[user.role]}
                </span>
              </span>
              <button type="button" onClick={handleLogout} className="btn btn-secondary btn-sm">
                <LogoutIcon />
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary btn-sm">
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="btn btn-secondary btn-sm md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
          <span>{open ? 'Close' : 'Menu'}</span>
        </button>
      </nav>

      {/* Mobile panel */}
      {open && (
        <div id="mobile-nav" className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 md:hidden">
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={(s) => `block ${linkClass(s)} py-3`}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-slate-200 pt-3">
            {user ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-700">
                  Signed in as <span className="font-medium">{user.name}</span> ({ROLE_LABEL[user.role]})
                </p>
                <button type="button" onClick={handleLogout} className="btn btn-secondary btn-sm">
                  <LogoutIcon />
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" className="btn btn-secondary btn-sm flex-1">
                  Log in
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm flex-1">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default NavBar;
