// ============================================================
// Codeline.AI EBMS - Central System Core Manager
// File: app.js
// ============================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbwzYZmxZ3AQCBdXRDgg5p442mW-THoHvR4YI2eA1G2ERICPS052J1oM5CXPYc83w0wnvw/exec';

// ============================================================
// GLOBAL PAGE LOADER — full-screen overlay
//
// Shown during:
//   1. Cross-page navigation (sidebar links, quick-action cards)
//      so there's no blank flash while the next HTML/JS loads.
//   2. Any fetch() routed through fetchWithLoader() — useful for
//      the initial data load on a page (e.g. loadEmployeesData()).
//
// Plain fetch() calls are left untouched, so per-button "Saving..."
// UX (disabled button + inline text) keeps working without a
// double overlay on top of it.
// ============================================================
let _loaderActiveCount = 0; // supports overlapping calls without flicker

function _ensureLoaderDom() {
  if (document.getElementById('ebmsPageLoader')) return;

  if (!document.getElementById('ebms-loader-styles')) {
    const style = document.createElement('style');
    style.id = 'ebms-loader-styles';
    style.innerHTML = `
      #ebmsPageLoader {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: none;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 16px;
        background: rgba(8,8,9,0.72);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        opacity: 0;
        transition: opacity 0.18s ease;
      }
      #ebmsPageLoader.show {
        display: flex;
        opacity: 1;
      }
      #ebmsPageLoader .ebms-loader-ring {
        width: 42px;
        height: 42px;
        border: 3px solid rgba(255,255,255,0.14);
        border-top-color: #D4D9E6;
        border-radius: 50%;
        animation: ebmsLoaderSpin 0.7s linear infinite;
      }
      #ebmsPageLoader .ebms-loader-text {
        font-family: 'Inter', sans-serif;
        font-size: 13.5px;
        color: #D4D9E6;
        letter-spacing: 0.2px;
      }
      @keyframes ebmsLoaderSpin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  }

  const overlay = document.createElement('div');
  overlay.id = 'ebmsPageLoader';
  overlay.innerHTML = `
    <div class="ebms-loader-ring"></div>
    <div class="ebms-loader-text" id="ebmsPageLoaderText">Loading...</div>
  `;
  document.body.appendChild(overlay);
}

function showPageLoader(message) {
  _ensureLoaderDom();
  _loaderActiveCount++;
  const overlay = document.getElementById('ebmsPageLoader');
  const textEl  = document.getElementById('ebmsPageLoaderText');
  if (textEl) textEl.textContent = message || 'Loading...';
  overlay.classList.add('show');
}

function hidePageLoader() {
  _loaderActiveCount = Math.max(0, _loaderActiveCount - 1);
  if (_loaderActiveCount === 0) {
    const overlay = document.getElementById('ebmsPageLoader');
    if (overlay) overlay.classList.remove('show');
  }
}

// Force-hide regardless of count — useful right before navigation,
// where the page is about to unload anyway, or for emergency reset.
function forceHidePageLoader() {
  _loaderActiveCount = 0;
  const overlay = document.getElementById('ebmsPageLoader');
  if (overlay) overlay.classList.remove('show');
}

// Wrapper around fetch() that shows the overlay for the duration of
// the request. Use this for data-loading calls where a blank/stale
// screen would otherwise be visible (e.g. the first fetch on page
// load). Falls back to hiding the loader even if the request throws.
async function fetchWithLoader(url, options, loaderMessage) {
  showPageLoader(loaderMessage);
  try {
    const res = await fetch(url, options);
    return res;
  } finally {
    hidePageLoader();
  }
}

// Show the loader immediately, then navigate. Used for sidebar/nav
// links so there's no blank flash between unload and the next page's
// first paint + first fetch. Safety timeout auto-hides the overlay if
// navigation is somehow cancelled (e.g. user hits back mid-flight).
function navigateWithLoader(url) {
  showPageLoader('Loading...');
  setTimeout(forceHidePageLoader, 8000);
  window.location.href = url;
}

// ============================================================
// QR Attendance — shared checksum util
// IMPORTANT: This exact secret + function must also exist in your
// Apps Script backend (appscript_attendance.gs) so it can verify
// scanned QR codes. Keep both sides in sync if you ever change it.
// ============================================================
const QR_SECRET_KEY = 'CDLN-EBMS-2025-SECURE';

function generateQrChecksum(empId, secretKey) {
  const str = String(empId) + '::' + secretKey;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // force 32-bit int
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0').slice(0, 8);
}

const AppSession = {
  getToken: function() { return localStorage.getItem('ebms_token'); },
  getUser: function() {
    const userJson = localStorage.getItem('ebms_user');
    return userJson ? JSON.parse(userJson) : null;
  },
  getRole: function() { return localStorage.getItem('ebms_role'); },
  protect: function() {
    if (!localStorage.getItem('ebms_token')) { window.location.href = 'index.html'; return; }

    // Role-aware page guard: employees stay on their own dashboard,
    // and the admin-side dashboard isn't meant for the employee role.
    const role = localStorage.getItem('ebms_role');
    const page = window.location.pathname.split('/').pop();
    if (role === 'employee' && page === 'dashboard.html') {
      window.location.href = 'employee_dashboard.html';
    } else if (role && role !== 'employee' && page === 'employee_dashboard.html') {
      window.location.href = 'dashboard.html';
    }
  }
};

function showToast(message) {
  let toast = document.getElementById('systemToastNotification') || document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'systemToastNotification';
    document.body.appendChild(toast);
  }
  toast.style.cssText = 'position: fixed; bottom: 24px; right: 24px; left: auto; max-width: calc(100% - 48px); background: rgba(24, 24, 27, 0.6); backdrop-filter: blur(18px) saturate(140%); -webkit-backdrop-filter: blur(18px) saturate(140%); border: 1px solid rgba(255,255,255,0.10); border-radius: 14px; padding: 14px 22px; font-size: 13.5px; font-family: "Inter", sans-serif; z-index: 9999; box-shadow: 0 16px 40px rgba(0,0,0,0.55); color: #F4F4F5; transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); opacity: 0; transform: translateY(20px);';

  // Trigger layout refresh before applying animation
  toast.offsetHeight;

  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
  }, 3200);
}

function formatTime12Hour(timeValue) {
  if (!timeValue && timeValue !== 0) return '—';
  const str = String(timeValue).trim();
  let h = 0, m = 0;

  if (str.includes('T')) {
    // ISO datetime string: "2026-06-27T11:38:00.000Z"
    const parts = str.split('T')[1].split(':');
    h = parseInt(parts[0], 10); m = parseInt(parts[1], 10);
  } else if (str.includes(':')) {
    // Plain time string: "11:38" or "11:38:00"
    const parts = str.split(':');
    h = parseInt(parts[0], 10); m = parseInt(parts[1], 10);
  } else if (!isNaN(parseFloat(str))) {
    // Google Sheets decimal time: 0.4847... = 11:38
    // Sheets stores time as fraction of a day (1.0 = 24 hours)
    const totalMinutes = Math.round(parseFloat(str) * 24 * 60);
    h = Math.floor(totalMinutes / 60) % 24;
    m = totalMinutes % 60;
  } else {
    return str; // Unknown format — return as-is
  }

  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; h = h ? h : 12;
  return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
}

async function injectSidebar() {
  const spacer = document.querySelector('.sidebar-spacer');
  if (!spacer) return;

  // FIX: sidebar.html uses '.open' class — app.js injected CSS must match
  if (!document.getElementById('ebms-sidebar-styles')) {
    const styles = document.createElement('style');
    styles.id = 'ebms-sidebar-styles';
    styles.innerHTML = `
      .sidebar-overlay-mask {
        display: none; position: fixed; inset: 0;
        background: rgba(0,0,0,0.65);
        backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
        z-index: 999;
        transition: opacity 0.25s ease;
      }
      .ebms-sidebar-aside {
        width: 240px; min-height: 100vh;
        background: linear-gradient(165deg, rgba(30,30,34,0.72) 0%, rgba(10,10,12,0.85) 100%);
        backdrop-filter: blur(22px) saturate(140%);
        -webkit-backdrop-filter: blur(22px) saturate(140%);
        border-right: 1px solid rgba(255,255,255,0.07);
        display: flex; flex-direction: column;
        position: fixed; top: 0; left: 0; z-index: 1000;
        box-shadow: 12px 0 40px rgba(0,0,0,0.45);
        transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
      }
      @media (max-width: 768px) {
        .ebms-sidebar-aside { transform: translateX(-100%); }
        .ebms-sidebar-aside.open { transform: translateX(0) !important; }
        .sidebar-overlay-mask.open { display: block !important; }
      }
    `;
    document.head.appendChild(styles);
  }

  try {
    const res = await fetch('sidebar.html');
    const sidebarHTML = await res.text();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sidebarHTML;
    while (tempDiv.firstChild) {
      spacer.parentNode.insertBefore(tempDiv.firstChild, spacer);
    }

    const user = AppSession.getUser() || { name: 'User', role: 'employee', branch_id: '' };
    const roles = { super_admin: '👑 Super Admin', branch_manager: '🏢 Manager', hr: '👤 HR', employee: '💼 Staff' };

    if(document.getElementById('sidebarUserName')) document.getElementById('sidebarUserName').textContent = user.name;
    if(document.getElementById('sidebarUserRole')) document.getElementById('sidebarUserRole').textContent = roles[user.role] || user.role;
    if(document.getElementById('sidebarUserBranch')) document.getElementById('sidebarUserBranch').textContent = user.branch_id ? 'Branch: ' + user.branch_id : 'All Branches';

    const currentFile = window.location.pathname.split("/").pop();
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('href') === currentFile) {
        item.classList.add('active');
      }
    });

    attachNavLoaderIntercept();
  } catch (err) { console.error('Sidebar layout sync failure:', err); }
}

// ============================================================
// NAV LOADER INTERCEPT
// Catches clicks on same-tab internal links (sidebar items, quick
// action cards on dashboard, "View All" panel links, etc.) and
// shows the full-screen loader immediately instead of waiting for
// the browser to start painting the next page. Excludes anything
// that should NOT trigger a full navigation: external links,
// new-tab links, in-page anchors, buttons with onclick handlers,
// and the logout link (which clears storage first).
// ============================================================
function attachNavLoaderIntercept() {
  if (document.body.dataset.navLoaderAttached === '1') return;
  document.body.dataset.navLoaderAttached = '1';

  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');

    // Skip: empty/hash links, explicit new-tab, external URLs, mailto/tel,
    // logout (handled by its own onclick which clears storage first),
    // and anything marked to opt out.
    if (!href || href === '#' || href.startsWith('javascript:')) return;
    if (link.target === '_blank') return;
    if (/^(https?:)?\/\//i.test(href)) return;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (link.hasAttribute('data-no-loader')) return;
    if (link.classList.contains('btn-logout')) return;

    // Only intercept plain left-clicks (let ctrl/cmd/shift-click open in new tab normally)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    e.preventDefault();
    navigateWithLoader(href);
  });
}

// FIX: Now uses '.open' class to match sidebar.html's own CSS & script
function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const mask = document.getElementById('sidebarOverlayMask');
  if(sidebar) sidebar.classList.add('open');
  if(mask) mask.classList.add('open');
}
function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const mask = document.getElementById('sidebarOverlayMask');
  if(sidebar) sidebar.classList.remove('open');
  if(mask) mask.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', function () {
  injectSidebar();
  // Pages without a sidebar (e.g. employee_dashboard.html, which has
  // its own top navbar) still have internal links — attach the
  // intercept regardless of whether a sidebar exists on this page.
  attachNavLoaderIntercept();
});

// Whenever this page actually becomes visible (fresh load, or restored
// from the browser's back/forward cache), clear any loader that might
// still be showing from the click that navigated here.
window.addEventListener('pageshow', function () {
  forceHidePageLoader();
});