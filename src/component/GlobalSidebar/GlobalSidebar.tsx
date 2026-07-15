import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SidebarMenuItem from './SidebarMenuItem';
import { useAccessRequest } from '../../contexts/AccessRequestContext';
import './GlobalSidebar.css';
import { fetchDataProductsList, resetDataProductsUIState } from '../../features/dataProducts/dataProductsSlice';
import { fetchGlossaries, resetGlossaryUIState } from '../../features/glossaries/glossariesSlice';
import { resetBrowseUIState } from '../../features/resources/resourcesSlice';
import { useDispatch } from 'react-redux';
import { type AppDispatch } from '../../app/store';
import { useAuth } from '../../auth/AuthProvider';
import { SIDEBAR_ICONS } from '../../constants/icons';
import { version } from '../../../package.json';

const GlobalSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAccessPanelOpen } = useAccessRequest();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();

  const isSearchActive = location.pathname === '/home'
                      || location.pathname === '/search'
                      || location.pathname === '/view-details';
  const isGlossariesActive = location.pathname === '/glossaries';
  const isAnnotationsActive = location.pathname === '/browse-by-annotation';
  const isDataProductsActive = location.pathname.startsWith('/data-products');

  const handleSearchClick = () => {
    navigate('/home');
  };

  const handleGlossariesClick = () => {
    dispatch(resetGlossaryUIState());
    dispatch(fetchGlossaries({ id_token: user?.token }));
    navigate('/glossaries');
  };

  const handleAnnotationsClick = () => {
    dispatch(resetBrowseUIState());
    navigate('/browse-by-annotation');
  };

  const handleDataProducts = () => {
    dispatch(resetDataProductsUIState());
    dispatch(fetchDataProductsList({ id_token: user?.token }));
    navigate('/data-products');
  };

  return (
    <nav
      className="global-sidebar"
      style={{
        zIndex: isAccessPanelOpen ? 999 : 1200,
      }}
    >
      <div className="sidebar-menu-items">
        <SidebarMenuItem
          icon={SIDEBAR_ICONS.SEARCH}
          label="Search"
          isActive={isSearchActive}
          onClick={handleSearchClick}
        />

        <SidebarMenuItem
          icon={SIDEBAR_ICONS.GLOSSARIES}
          label="Glossaries"
          isActive={isGlossariesActive}
          onClick={handleGlossariesClick}
        />

        <SidebarMenuItem
          icon={SIDEBAR_ICONS.ASPECTS}
          label="Aspects"
          isActive={isAnnotationsActive}
          onClick={handleAnnotationsClick}
        />

        <SidebarMenuItem
          icon={
            <span className="dp-icon">
              <svg 
                className="sidebar-icon dp-outline" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M11.166 3.0918C11.6921 2.83619 12.3079 2.83619 12.834 3.0918L20.707 6.91699C20.943 7.03166 21.0946 7.26853 21.0996 7.53027C21.1044 7.79216 20.9611 8.0349 20.7295 8.1582L17.7373 9.74902L20.707 11.1924C20.9431 11.3071 21.0946 11.5439 21.0996 11.8057C21.1044 12.0675 20.9612 12.3103 20.7295 12.4336L17.7373 14.0244L20.707 15.4678C20.943 15.5825 21.0948 15.8192 21.0996 16.0811C21.1045 16.343 20.9613 16.5857 20.7295 16.709L12.8955 20.877C12.3361 21.1746 11.6639 21.1745 11.1045 20.877L3.27051 16.709C3.03876 16.5857 2.89555 16.3429 2.90039 16.0811C2.90528 15.8192 3.05691 15.5825 3.29297 15.4678L6.26172 14.0244L3.27051 12.4336C3.03874 12.3103 2.89555 12.0675 2.90039 11.8057C2.90529 11.5439 3.05696 11.3071 3.29297 11.1924L6.26172 9.74902L3.27051 8.1582C3.03878 8.03491 2.89555 7.79219 2.90039 7.53027C2.90538 7.26851 3.05699 7.03165 3.29297 6.91699L11.166 3.0918ZM12.8955 16.6016C12.3359 16.8991 11.6641 16.8991 11.1045 16.6016L7.78516 14.835L5.13672 16.1221L11.7637 19.6475C11.9111 19.7259 12.0889 19.7259 12.2363 19.6475L18.8623 16.1221L16.2139 14.835L12.8955 16.6016ZM12.8955 12.3262C12.3359 12.6237 11.6641 12.6237 11.1045 12.3262L7.78516 10.5596L5.13672 11.8467L11.7637 15.3721C11.9111 15.4505 12.0889 15.4505 12.2363 15.3721L18.8623 11.8467L16.2139 10.5596L12.8955 12.3262ZM12.2197 4.34473C12.0813 4.27741 11.9187 4.27741 11.7803 4.34473L5.13672 7.57129L11.7637 11.0967C11.9111 11.1751 12.0889 11.1751 12.2363 11.0967L18.8623 7.57129L12.2197 4.34473Z" 
                  fill="currentColor" 
                  stroke="currentColor" 
                  strokeWidth="0.2"
                />
              </svg>
              <svg className="sidebar-icon dp-filled" width="24" height="24"
     viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M12.2197 4.34473C12.0813 4.27741 11.9187 4.27741 11.7803 4.34473L5.13672 7.57129L11.7637 11.0967C11.9111 11.1751 12.0889 11.1751 12.2363 11.0967L18.8623 7.57129L12.2197 4.34473ZM12.8955 12.3262C12.3359 12.6237 11.6641 12.6237 11.1045 12.3262L7.78516 10.5596L5.13672 11.8467L11.7637 15.3721C11.9111 15.4505 12.0889 15.4505 12.2363 15.3721L18.8623 11.8467L16.2139 10.5596L12.8955 12.3262ZM12.8955 16.6016C12.3359 16.8991 11.6641 16.8991 11.1045 16.6016L7.78516 14.835L5.13672 16.1221L11.7637 19.6475C11.9111 19.7259 12.0889 19.7259 12.2363 19.6475L18.8623 16.1221L16.2139 14.835L12.8955 16.6016Z"
    fill="currentColor"
  />
</svg>
           </span>
          }
          label="Data Products"
          isActive={isDataProductsActive}
          onClick={handleDataProducts}
        />
      </div>

      <div className="sidebar-version">v{version}</div>
    </nav>
  );
};

export default GlobalSidebar;
