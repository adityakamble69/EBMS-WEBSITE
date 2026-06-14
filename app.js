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
    toast.style.cssText = 'position: fixed; bottom: 24px; right: 24px; background: #1F2937; border: 1px solid #374151; border-radius: 8px; padding: 12px 20px; font-size: 13.5px; z-index: 9999; box-shadow: 0 8px 24px rgba(0,0,0,0.3); color: #F9FAFB; transition: all 0.3s ease; opacity: 0; transform: translateY(100px);';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  setTimeout(function() { toast.style.opacity = '0'; toast.style.transform = 'translateY(100px)'; }, 3200);
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
    styles.innerHTML = '.sidebar-overlay-mask { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 999; } .ebms-sidebar-aside { width: 240px; min-height: 100vh; background: #0D1323; border-right: 1px solid rgba(255,255,255,0.04); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; z-index: 1000; transition: transform 0.25s ease-in-out; } @media (max-width: 768px) { .ebms-sidebar-aside { transform: translateX(-100%); } .ebms-sidebar-aside.mobile-open { transform: translateX(0) !important; } .sidebar-overlay-mask.mobile-open { display: block !important; } }';
    document.head.appendChild(styles);
  }

  try {
    const res = await fetch('sidebar.html');
    const sidebarHTML = await res.text();
    // Insert sidebar HTML before the spacer (don't replace it — spacer holds the layout gap)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sidebarHTML;
    while (tempDiv.firstChild) {
      spacer.parentNode.insertBefore(tempDiv.firstChild, spacer);
    }

    const user = AppSession.getUser() || { name: 'User', role: 'employee', branch_id: '' };
    const roles = { super_admin: '👑 Super Admin', branch_manager: '🏢 Manager', hr: '👤 HR', employee: '💼 Staff' };
    
    document.getElementById('sidebarUserName').textContent = user.name;
    document.getElementById('sidebarUserRole').textContent = roles[user.role] || user.role;
    document.getElementById('sidebarUserBranch').textContent = user.branch_id ? 'Branch: ' + user.branch_id : 'All Branches';

    const currentFile = window.location.pathname.split("/").pop();
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('href') === currentFile) {
        item.style.cssText = 'background: rgba(59,130,246,0.12); color: #60A5FA; font-weight: 500; border-radius: 8px; display: flex; align-items: center; gap: 10px; padding: 9px 10px; text-decoration: none; font-size: 13.5px;';
      }
    });
  } catch (err) { console.error('Sidebar asset configuration drop error:', err); }
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('mobile-open');
  document.getElementById('sidebarOverlayMask').classList.add('mobile-open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebarOverlayMask').classList.remove('mobile-open');
}

document.addEventListener('DOMContentLoaded', injectSidebar);