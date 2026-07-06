import React from 'react';
import GlobalSidebar from '../GlobalSidebar/GlobalSidebar';
import Navbar from '../Navbar/Navbar';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  searchBar?: boolean;
  searchNavigate?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, searchBar = false, searchNavigate = true }) => {
  return (
    <div className="app-layout">
      <GlobalSidebar />
      <div className="main-content-area">
        <Navbar searchBar={searchBar} searchNavigate={searchNavigate} />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
