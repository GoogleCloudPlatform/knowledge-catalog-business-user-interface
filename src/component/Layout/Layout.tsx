import React from 'react';
import GlobalSidebar from '../GlobalSidebar/GlobalSidebar';
import Navbar from '../Navbar/Navbar';
import './Layout.css';
import { AppBootstrapContext, useAppBootstrap } from '../../hooks/useAppBootstrap';

interface LayoutProps {
  children: React.ReactNode;
  searchBar?: boolean;
  searchNavigate?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, searchBar = false, searchNavigate = true }) => {
  // Fetches appConfig + get-projects once here, since Layout wraps every
  // authenticated route — this is what guarantees the fetch happens
  // regardless of entry point (fresh login, deep link, or reload).
  const bootstrapStatus = useAppBootstrap();

  return (
    <AppBootstrapContext.Provider value={bootstrapStatus}>
      <div className="app-layout">
        <GlobalSidebar />
        <div className="main-content-area">
          <Navbar searchBar={searchBar} searchNavigate={searchNavigate} />
          <div className="page-content">
            {children}
          </div>
        </div>
      </div>
    </AppBootstrapContext.Provider>
  );
};

export default Layout;
