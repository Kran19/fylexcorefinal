"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { adminLogout } from '@/services/adminApi';
import '@/app/admin/css/custom.css';

/**
 * Navigation config — mirrors Laravel sidebar.blade.php exactly.
 * Active state uses left-border + bg gradient (matches Laravel's active styling).
 */
const navItems = [
  {
    key: 'dashboard',
    title: 'Dashboard',
    icon: 'fas fa-home',
    path: '/admin/dashboard',
  },
  {
    key: 'reports',
    title: 'Reports',
    icon: 'fas fa-chart-line',
    path: '/admin/reports',
  },
  {
    key: 'products',
    title: 'Products',
    icon: 'fas fa-cube',
    path: '/admin/products',
    submenu: [
      { title: 'All Products', path: '/admin/products' },
      { title: 'Add Product', path: '/admin/products/create' },
      { title: 'Variants', path: '/admin/products/variants' },
      { title: 'Attributes', path: '/admin/products/attributes' },
      { title: 'Specifications', path: '/admin/products/specifications' },
      { title: 'Tags', path: '/admin/products/tags' },
      { title: 'Belts', path: '/admin/belts' },
      { title: 'Boxes', path: '/admin/boxes' },
    ],
  },
  {
    key: 'categories',
    title: 'Categories',
    icon: 'fas fa-tags',
    path: '/admin/categories',
    submenu: [
      { title: 'All Categories', path: '/admin/categories' },
      { title: 'Add New', path: '/admin/categories?new=true' },
    ],
  },
  {
    key: 'taxes',
    title: 'Taxes',
    icon: 'fas fa-percent',
    path: '/admin/taxes',
  },
  {
    key: 'orders',
    title: 'Orders',
    icon: 'fas fa-shopping-cart',
    path: '/admin/orders',
  },
  {
    key: 'offers',
    title: 'Offers',
    icon: 'fas fa-percentage',
    path: '/admin/offers',
    submenu: [
      { title: 'All Offers', path: '/admin/offers' },
      { title: 'Add New', path: '/admin/offers/create' },
    ],
  },
  {
    key: 'users',
    title: 'Customers',
    icon: 'fas fa-users',
    path: '/admin/users',
  },
  {
    key: 'speed-booster',
    title: 'Speed Booster',
    icon: 'fas fa-bolt',
    path: '/admin/media/optimization-center',
    submenu: [
      { title: 'Media Library', path: '/admin/media' },
      { title: 'Optimization Center', path: '/admin/media/optimization-center' },
      { title: 'Image Optimization', path: '/admin/media/image-optimization' },
      { title: 'Video Optimization', path: '/admin/media/video-optimization' },
      { title: 'Storage Analytics', path: '/admin/media/storage-analytics' },
      { title: 'Optimization History', path: '/admin/media/optimization-history' },
      { title: 'Deleted Assets', path: '/admin/media/deleted-assets' },
    ],
  },
  {
    key: 'cms',
    title: 'Dynamic Pages (CMS)',
    icon: 'fas fa-pager',
    path: '/admin/cms',
    submenu: [
      { title: 'Home Page Layout', path: '/admin/cms/home-sections' },
      { title: 'About Page', path: '/admin/cms/about' },
      { title: 'Sliders', path: '/admin/cms/banners' },
      { title: 'Design System', path: '/admin/settings/design' },
    ],
  },
  {
    key: 'community',
    title: 'Community',
    icon: 'fas fa-camera-retro',
    path: '/admin/community',
  },

  {
    key: 'care',
    title: 'Care & Support',
    icon: 'fas fa-life-ring',
    path: '/admin/care',
    submenu: [
      { title: 'FAQs', path: '/admin/faqs' },
      { title: 'Watch Care Steps', path: '/admin/care-steps' },
    ],
  },
  {
    key: 'shipping',
    title: 'Shipping',
    icon: 'fas fa-truck',
    path: '/admin/shipping',
  },
  {
    key: 'settings',
    title: 'Settings',
    icon: 'fas fa-cog',
    path: '/admin/settings',
  },
  {
    key: 'login-settings',
    title: 'Login',
    icon: 'fas fa-sign-in-alt',
    path: '/admin/login-settings',
  },
];

const Sidebar = ({ mobileOpen, setMobileOpen, isExpanded, setIsExpanded }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [openSubmenus, setOpenSubmenus] = useState({});

  const toggleSubmenu = (key) => {
    setOpenSubmenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isPathActive = (path) => pathname === path || pathname.startsWith(path + '/');

  const isItemActive = (item) => {
    if (isPathActive(item.path)) return true;
    return item.submenu ? item.submenu.some(sub => isPathActive(sub.path)) : false;
  };

  const isSubmenuOpen = (item) => {
    const active = isItemActive(item);
    // If manually toggled, use that state; otherwise auto-open active parent
    return openSubmenus[item.key] !== undefined ? openSubmenus[item.key] : active;
  };

  return (
    <>
      <aside
        className={`admin-sidebar ${isExpanded ? 'expanded' : ''} ${mobileOpen ? 'mobile-show' : ''}`}
        style={{ transition: 'width 0.3s ease, transform 0.3s ease' }}
      >
        <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '16px 12px 14px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '8px' }}>
          <Link href="/admin/dashboard" style={{ display: 'block', width: '100%', textAlign: 'center' }}>
            <img 
              src="/fylex.png" 
              alt="FYLEX" 
              style={{ 
                maxHeight: '28px', 
                width: 'auto', 
                maxWidth: '130px', 
                objectFit: 'contain', 
                margin: '0 auto', 
                display: 'block' 
              }} 
            />
          </Link>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const hasSubmenu = !!item.submenu;
            const active = isItemActive(item);
            const submenuOpen = hasSubmenu && isSubmenuOpen(item);

            return (
              <div key={item.key}>
                {/* Parent link / button */}
                {hasSubmenu ? (
                  <button
                    onClick={() => toggleSubmenu(item.key)}
                    className={`nav-link ${active ? 'active' : ''}`}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'none',
                      font: 'inherit',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                    title={!isExpanded ? item.title : undefined}
                  >
                    <i className={item.icon}></i>
                    <span className="nav-link-text" style={{ flex: 1 }}>{item.title}</span>
                    {isExpanded && (
                      <svg
                        className="nav-link-text"
                        width="10"
                        height="6"
                        viewBox="0 0 10 6"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{
                          transform: submenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                          opacity: 0.8,
                          marginLeft: 'auto'
                        }}
                      >
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                ) : (
                  <Link
                    href={item.path}
                    className={`nav-link ${active ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                    title={!isExpanded ? item.title : undefined}
                  >
                    <i className={item.icon}></i>
                    <span className="nav-link-text">{item.title}</span>
                  </Link>
                )}

                {/* Submenu */}
                {hasSubmenu && submenuOpen && isExpanded && (
                  <div className="submenu">
                    {item.submenu.map((sub, idx) => (
                      <Link
                        key={idx}
                        href={sub.path}
                        className={isPathActive(sub.path) ? 'active' : ''}
                        onClick={() => setMobileOpen(false)}
                      >
                        {sub.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div
            className="nav-link logout-btn"
            style={{
              marginBottom: 10,
              border: '1px solid rgba(239,68,68,0.18)',
              background: 'rgba(239,68,68,0.05)',
              cursor: 'pointer'
            }}
            onClick={() => {
              adminLogout();
              logout();
              router.push('/admin/login');
            }}
            title={!isExpanded ? 'Logout' : undefined}
          >
            <i className="fas fa-sign-out-alt" style={{ color: '#ef4444' }}></i>
            <span className="nav-link-text" style={{ color: '#ef4444', fontWeight: 600 }}>
              Logout
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="sidebar-toggle hidden md:flex"
            title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <i className={`fas fa-chevron-${isExpanded ? 'left' : 'right'}`}></i>
            {isExpanded && <span className="nav-link-text">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 30,
          }}
        />
      )}
    </>
  );
};

export default Sidebar;
