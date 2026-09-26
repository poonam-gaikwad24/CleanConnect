import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <Link to="/" className="font-bold text-slate-800">
          CleanConnect
        </Link>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
          {user?.role == 'CITIZEN' && (
          <Link to="/toilets" className="hover:underline">
            Toilets
          </Link>
          )}
          {user?.role == 'CITIZEN' && (
            <Link to="/complaints/create" className="hover:underline">
              Report an Issue
            </Link>
          )}
          {user?.role == 'CITIZEN' && (
            <Link to="/my-complaints" className="hover:underline">
              My Complaints
            </Link>
          )}
          {user?.role == 'CITIZEN' && (
            <Link to="/toilet-requests/create" className="hover:underline">
              Request Toilet
            </Link>
          )}
          {user?.role == 'CITIZEN' && (
            <Link to="/my-toilet-requests" className="hover:underline">
              My Requests
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link to="/admin/complaints" className="hover:underline">
              Admin: Complaints
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link to="/admin/toilet-requests" className="hover:underline">
              Admin: Requests
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link to="/admin/toilets" className="hover:underline">
              Admin: Toilets
            </Link>
          )}
          {user ? (
            <>
              <span className="text-slate-400">{user.name}</span>
              <button onClick={handleLogout} className="text-slate-600 hover:underline">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:underline">
                Log in
              </Link>
              <Link to="/register" className="hover:underline">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
