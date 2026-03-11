export function initHeaderMenu() {
  const header = document.querySelector('.site-header');
  const headerTop = header?.querySelector('.header-top');
  const nav = headerTop?.querySelector('.nav');
  if (!header || !headerTop || !nav) return;

  document.documentElement.classList.add('has-header-menu');

  const menuId = nav.id || 'site-nav-menu';
  nav.id = menuId;

  let toggle = headerTop.querySelector('.header-toggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'header-toggle';
    toggle.setAttribute('aria-controls', menuId);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Открыть меню');
    toggle.innerHTML = '<span></span><span></span><span></span>';
    headerTop.insertBefore(toggle, nav);
  }

  const syncState = (isOpen) => {
    header.classList.toggle('menu-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
  };

  const closeMenu = () => syncState(false);

  toggle.addEventListener('click', () => {
    const isOpen = header.classList.contains('menu-open');
    syncState(!isOpen);
  });

  nav.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    closeMenu();
  });

  document.addEventListener('click', (event) => {
    if (!header.classList.contains('menu-open')) return;
    if (header.contains(event.target)) return;
    closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  });

  const mediaQuery = window.matchMedia('(min-width: 681px)');
  const handleViewportChange = (query) => {
    if (query.matches) {
      closeMenu();
    }
  };

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleViewportChange);
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(handleViewportChange);
  }

  syncState(false);
}
