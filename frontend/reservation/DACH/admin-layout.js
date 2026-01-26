(() => {
    const ADMIN_STORAGE_KEY = 'adminUser';
    const THEME_KEY = 'theme';
    const SIDEBAR_KEY = 'adminSidebarCollapsed';

    const getAdminUser = () => {
        try {
            const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    };

    const setTheme = (theme) => {
        const body = document.body;
        const darkModeToggle = document.getElementById('darkModeToggle');
        const darkModeIcon = document.getElementById('darkModeIcon');
        const isDark = theme === 'dark';

        body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        if (darkModeIcon) {
            darkModeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }
        if (darkModeToggle) {
            darkModeToggle.classList.toggle('active', isDark);
        }

        const logo = document.getElementById('sidebarLogo');
        if (logo) {
            logo.src = isDark ? 'image/logo1.png' : 'image/logodark.png';
        }
    };

    const initTheme = () => {
        const savedTheme = localStorage.getItem(THEME_KEY);
        const theme = savedTheme || 'dark';
        setTheme(theme);

        const darkModeToggle = document.getElementById('darkModeToggle');
        if (!darkModeToggle) {
            return;
        }

        darkModeToggle.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme') || 'dark';
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            localStorage.setItem(THEME_KEY, nextTheme);
            setTheme(nextTheme);
        });
    };

    const initSidebar = () => {
        const storedCollapsed = localStorage.getItem(SIDEBAR_KEY) === 'true';
        document.body.classList.toggle('sidebar-collapsed', storedCollapsed);

        const toggles = document.querySelectorAll('[data-action="toggle-sidebar"]');
        const overlay = document.getElementById('sidebarOverlay');

        const toggleSidebar = () => {
            const isMobile = window.innerWidth <= 1024;
            if (isMobile) {
                document.body.classList.toggle('sidebar-open');
                return;
            }
            const collapsed = document.body.classList.toggle('sidebar-collapsed');
            localStorage.setItem(SIDEBAR_KEY, collapsed ? 'true' : 'false');
        };

        toggles.forEach((toggle) => {
            toggle.addEventListener('click', toggleSidebar);
        });

        if (overlay) {
            overlay.addEventListener('click', () => {
                document.body.classList.remove('sidebar-open');
            });
        }

        window.addEventListener('resize', () => {
            if (window.innerWidth > 1024) {
                document.body.classList.remove('sidebar-open');
            }
        });
    };

    const setActiveSidebarLink = () => {
        const currentPage = window.location.pathname.split('/').pop();
        const links = document.querySelectorAll('.sidebar-link');
        links.forEach((link) => {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
            }
        });
    };

    const renderAdminInfo = () => {
        const admin = getAdminUser();
        const nameEl = document.getElementById('adminName');
        const initialsEl = document.getElementById('adminInitials');
        if (!admin || !nameEl) {
            return;
        }

        const fullName = `${admin.nom || ''} ${admin.prenom || ''}`.trim();
        nameEl.textContent = fullName || admin.email || 'Admin';

        if (initialsEl) {
            const initials = `${(admin.nom || '').charAt(0)}${(admin.prenom || '').charAt(0)}`.toUpperCase();
            initialsEl.textContent = initials || 'A';
        }
    };

    const requireAdmin = () => {
        const admin = getAdminUser();
        if (!admin) {
            window.location.href = 'loginN.html';
            return false;
        }
        return true;
    };

    const initLogout = () => {
        const logoutButtons = document.querySelectorAll('.js-admin-logout');
        logoutButtons.forEach((button) => {
            button.addEventListener('click', () => {
                localStorage.removeItem(ADMIN_STORAGE_KEY);
                window.location.href = 'loginN.html';
            });
        });
    };

    const init = () => {
        if (!requireAdmin()) {
            return;
        }
        initTheme();
        initSidebar();
        setActiveSidebarLink();
        renderAdminInfo();
        initLogout();
    };

    window.AdminLayout = {
        getAdminUser,
        setTheme,
        requireAdmin,
    };

    document.addEventListener('DOMContentLoaded', init);
})();
