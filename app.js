// ============================================================
// Codeline.AI EBMS - Central System Core Manager
// File: app.js
// ============================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbw8NY1rDyI47qjA6S-gxCWCkuIerqUL-lqkw0EienUt4t1l8nx8aWI5jNdw6Kk8SE05rA/exec';

const AppSession = {
  getToken: function() { return localStorage.getItem('ebms_token'); },
  getUser: function() {
    const userJson = localStorage.getItem('ebms_user');
    return userJson ? JSON.parse(userJson) : null;
  },
  getRole: function() { return localStorage.getItem('ebms_role'); },
  protect: function() {
    if (!localStorage.getItem('ebms_token')) { window.location.href = 'index.html'; }
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
  if (!timeValue) return '—';
  const str = String(timeValue).trim();
  let h = 0, m = 0;
  if (str.includes('T')) {
    const parts = str.split('T')[1].split(':');
    h = parseInt(parts[0], 10); m = parseInt(parts[1], 10);
  } else if (str.includes(':')) {
    const parts = str.split(':');
    h = parseInt(parts[0], 10); m = parseInt(parts[1], 10);
  } else { return str; }
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; h = h ? h : 12;
  return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
}

async function injectSidebar() {
  const spacer = document.querySelector('.sidebar-spacer');
  if (!spacer) return;

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
        .ebms-sidebar-aside.mobile-open { transform: translateX(0) !important; }
        .sidebar-overlay-mask.mobile-open { display: block !important; }
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
  } catch (err) { console.error('Sidebar layout sync failure:', err); }
}

function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const mask = document.getElementById('sidebarOverlayMask');
  if(sidebar) sidebar.classList.add('mobile-open');
  if(mask) mask.classList.add('mobile-open');
}
function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const mask = document.getElementById('sidebarOverlayMask');
  if(sidebar) sidebar.classList.remove('mobile-open');
  if(mask) mask.classList.remove('mobile-open');
}

document.addEventListener('DOMContentLoaded', injectSidebar);