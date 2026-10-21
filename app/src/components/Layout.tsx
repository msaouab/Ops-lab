import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { TopBar } from './TopBar';

/** Every new page starts at the top (the module page then scrolls to `?s=` itself). */
function ScrollManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function Layout() {
  return (
    <>
      <TopBar />
      <ScrollManager />
      <main className="wrap" id="main">
        <Outlet />
      </main>
    </>
  );
}
