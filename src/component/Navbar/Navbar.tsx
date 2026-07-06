import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import ButtonBase from '@mui/material/ButtonBase';
import './Navbar.css'
import { Menu as MenuIcon, KeyboardArrowDown } from '@mui/icons-material';
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../../app/store';
import { searchResourcesByTerm } from '../../features/resources/resourcesSlice';
import { useAuth } from '../../auth/AuthProvider';
import SendFeedback from './SendFeedback';
import NotificationBar from '../SearchPage/NotificationBar';
import UserAccountDropdown from './UserAccountDropdown';
import SearchBar from '../SearchBar/SearchBar';

interface NavBarProps {
  searchBar?: boolean;
  searchNavigate?: boolean;
}

const Navbar: React.FC<NavBarProps> = ({ searchBar = false, searchNavigate = true }) => {
  const { user, updateUser } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const searchFilters = useSelector((state: any) => state.search.searchFilters);
  const semanticSearch = useSelector((state: any) => state.search.semanticSearch);
  const id_token = user?.token || '';
  const dataSearch = useMemo(() => [
    { name: 'BigQuery' },
    { name: 'Data Warehouse' },
    { name: 'Data Lake' },
    { name: 'Data Pipeline' },
    { name: 'GCS' }
  ], []);

  const handleNavSearch = (text: string) => {
    dispatch({ type: 'resources/setItemsStoreData', payload: [] });
    dispatch(searchResourcesByTerm({ term: text, id_token, filters: searchFilters, semanticSearch }));
    searchNavigate && navigate('/search');
  };
  const { name, picture, email } = user ?? { name: '', picture: '', email: '' };
  const navigate = useNavigate();
  const location = useLocation();
  const mode = useSelector((state: any) => state.user.mode);
  const isSearchFiltersOpen = useSelector((state: any) => state.search.isSearchFiltersOpen);
  const isOnSearchPage = location.pathname === '/search';
  const shouldShiftNavbar = isOnSearchPage && isSearchFiltersOpen;
  const iconColor = mode === 'dark' ? '#9aa0a6' : '#5F6367';
  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(null);
  const [openFeedback, setOpenFeedback] = React.useState<boolean>(false);
  const [isNotificationVisible, setIsNotificationVisible] = React.useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = React.useState<string>('');

  const handleLogoClick = () => {
    if (user) {
      const userData = {
        name: user.name,
        email: user.email,
        picture: user.picture,
        token: user.token,
        tokenExpiry: user.tokenExpiry,
        tokenIssuedAt: user.tokenIssuedAt,
        hasRole: user.hasRole,
        roles: user.roles,
        permissions: user.permissions,
        iamDisplayRole: user.iamDisplayRole,
        appConfig: {}
      };
      updateUser(user.token, userData);
    }
    navigate('/home');
  };

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(anchorElUser ? null : event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleOpenFeedback = () => {
    setOpenFeedback(true);
  };

  const handleCloseFeedback = () => {
    setOpenFeedback(false);
  };

  const handleCloseNotification = () => {
    setIsNotificationVisible(false);
  };

  const handleUndoNotification = () => {
    setIsNotificationVisible(false);
  };

  const handleSendFeedbackSuccess = () => {
    setOpenFeedback(false);
    setNotificationMessage(`Feedback sent`);
    setIsNotificationVisible(true);
    setTimeout(() => {
      setIsNotificationVisible(false);
    }, 5000);
  };

  return (<>
    <AppBar position="static" sx={{
      background: mode === 'dark' ? '#131314' : '#FEFEFF',
      boxShadow: "none",
      borderBottom: location.pathname === '/home' ? 'none' : '1px solid rgba(232, 238, 245, 0.8)',
      flex: "0 0 auto",
      marginLeft: shouldShiftNavbar ? '252px' : '0px',
      width: shouldShiftNavbar ? 'calc(100% - 252px)' : '100%',
      transition: 'margin-left 0.3s ease-in-out, width 0.3s ease-in-out',
    }}>
      <Container maxWidth="xl" sx={{
        padding: 0,
        margin: 0,
        flex: "1 1 auto",
        width: "100%",
        maxWidth: "none !important",
        height: "100%"
      }}>
        <Toolbar disableGutters sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flex: "1 1 auto",
          minHeight: "4.5rem",
          height: "100%",
          padding: "0",
          gap: "2rem",
        }}>
          {/* Left Section - Logo */}
          <Box onClick={handleLogoClick} sx={{
            display: { xs: 'none', md: 'flex' },
            flex: "0 0 auto",
            width: "162px",
            height: "40px",
            cursor: "pointer",
          }}>
            <img
              src="/assets/svg/knowledge-catalog-logo-v2.svg"
              alt="Knowledge Catalog"
              style={{ width: '162px', height: '40px' }}
            />
          </Box>

          {searchBar && location.pathname !== '/admin-panel' ? (
            <Box sx={{
              display: { lg: 'flex' },
              flex: "1 1 41rem",
              alignItems: "center",
              justifyContent: "flex-start",
              height: "3rem",
            }}>
              <div className="navbar-searchbar-slot" style={{ width: 'calc(100% - 10.2%)', marginLeft: '0' }}>
                <SearchBar
                  handleSearchSubmit={handleNavSearch}
                  dataSearch={dataSearch}
                  variant="navbar"
                />
              </div>
            </Box>
          ) : (
            <Box sx={{ flex: "1 1 auto" }} />
          )}

          {/* Mobile Navigation */}
          <Box sx={{
            flex: "0 0 auto",
            display: { xs: 'flex', md: 'none' },
            alignItems: "center",
            gap: "1rem"
          }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              sx={{
                color: iconColor,
                p: "0.25rem"
              }}
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              keepMounted
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{ display: { xs: 'block', md: 'none' } }}
            >
              {/* <MenuItem onClick={() => { handleCloseNavMenu(); navigate('/guide'); }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: "0.5rem" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: mode === 'dark' ? '#c4c7c5' : '#444746', fontVariationSettings: "'FILL' 1" }}>menu_book</span>
                  <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>Guide</Typography>
                </Box>
              </MenuItem> */}
              <MenuItem onClick={handleOpenFeedback}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: "0.5rem" }}>
                  <FeedbackOutlinedIcon sx={{ fontSize: '24px', color: mode === 'dark' ? '#c4c7c5' : '#444746' }} />
                  <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>Feedback</Typography>
                </Box>
              </MenuItem>
            </Menu>
          </Box>

          {/* Mobile Logo */}
          <Box onClick={handleLogoClick} sx={{
            display: { xs: 'flex', md: 'none' },
            flex: "1 1 auto",
            justifyContent: "center",
            alignItems: "center",
            height: "2rem"
          }}>
            <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', cursor: "pointer" }}>
                <label style={{ fontSize: "19px", fontWeight: 700, color: mode === 'dark' ? '#c4c7c5' : "#0B57D0", lineHeight: 1, cursor: "pointer" }}>Knowledge</label>
                <label style={{ fontSize: "12px", fontWeight: 700, color: mode === 'dark' ? '#c4c7c5' : "#0B57D0", lineHeight: 1, cursor: "pointer" }}>Catalog</label>
              </div>
            </div>
          </Box>

          {/* Right Section - Icons and Avatar */}
          <Box sx={{
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "8px",
          }}>
            <Box sx={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}>
              {/* <Tooltip title="Guide" slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -10] } }] } }}>
                <IconButton sx={{
                    p: 0,
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    transition: 'background-color 0.2s',
                    '&:hover': { backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e1e1e1' },
                  }}
                  onClick={() => { navigate('/guide'); }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: mode === 'dark' ? '#c4c7c5' : '#444746', fontVariationSettings: "'FILL' 1" }}>menu_book</span>
                </IconButton>
              </Tooltip> */}
              <Tooltip title="Feedback" slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -10] } }] } }}>
                <IconButton sx={{
                    p: 0,
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    transition: 'background-color 0.2s',
                    '&:hover': { backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e1e1e1' },
                  }}
                  onClick={handleOpenFeedback}
                >
                  <FeedbackOutlinedIcon sx={{ fontSize: '24px', color: mode === 'dark' ? '#c4c7c5' : '#444746' }} />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Avatar */}
            <Tooltip
              slotProps={{
                tooltip: {
                  sx: {
                    backgroundColor: mode === 'dark' ? '#3C4043' : '#56595C',
                  },
                },
                popper: {
                  modifiers: [{ name: 'offset', options: { offset: [0, -10] } }],
                },
              }}
              title={
                anchorElUser ? "" : (
                  <Box sx={{ textAlign: 'left', fontFamily: '"Roboto", arial, sans-serif' }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, fontFamily: 'inherit', color: '#FFFFFF' }}>Google Account</Typography>
                    <Typography sx={{ fontSize: '0.75rem', fontFamily: 'inherit', color: mode === 'dark' ? '#9AA0A6' : '#BFC4C7' }}>{name}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', fontFamily: 'inherit', color: mode === 'dark' ? '#9AA0A6' : '#BFC4C7' }}>{email}</Typography>
                  </Box>
                )
              }
            >
              <ButtonBase
                onClick={handleOpenUserMenu}
                aria-label="Open settings"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 8px 4px 4px',
                  borderRadius: '100px',
                  transition: 'background-color 0.2s',
                  '&:hover': { backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e1e1e1' },
                  position: 'relative',
                  zIndex: anchorElUser ? 1400 : 'auto',
                }}
              >
                <Avatar
                  alt={name ?? ""}
                  src={picture ?? ""}
                  sx={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "70px",
                  }}
                />
                <Typography
                  sx={{
                    display: { xs: 'none', md: 'block' },
                    fontFamily: '"Google Sans", sans-serif',
                    fontWeight: 400,
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '-0.150391px',
                    color: mode === 'dark' ? '#e3e3e3' : '#0C1226',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {name}
                </Typography>
                <KeyboardArrowDown
                  sx={{
                    display: { xs: 'none', md: 'block' },
                    fontSize: '16px',
                    color: mode === 'dark' ? '#9aa0a6' : '#6A6E7C',
                    transform: anchorElUser ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </ButtonBase>
            </Tooltip>
            <UserAccountDropdown
              anchorEl={anchorElUser}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            />
          </Box>
        </Toolbar>
      </Container>
    </AppBar>

    <SendFeedback
      isOpen={openFeedback}
      onClose={handleCloseFeedback}
      onSubmitSuccess={handleSendFeedbackSuccess}
    />

    <NotificationBar
      isVisible={isNotificationVisible}
      onClose={handleCloseNotification}
      onUndo={handleUndoNotification}
      message={notificationMessage}
    />
  </>);
}
export default Navbar;
