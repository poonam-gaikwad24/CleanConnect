import { Link } from 'react-router-dom';

function AppFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-sm text-slate-600 sm:px-6">
        <p>
          <span className="font-semibold text-slate-800">CleanConnect</span> — community-driven
          public toilet maintenance.
        </p>
        <p>
          <Link to="/toilets" className="font-medium text-slate-700 hover:text-brand-800 hover:underline">
            Browse toilets
          </Link>
        </p>
      </div>
    </footer>
  );
}

export default AppFooter;
