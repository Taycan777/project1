import { getProducts } from './dataService.js';
import { renderProductList } from './products.js';
import { getCurrentUser, loginUser, registerUser, logout } from './auth.js';
import { validateLogin, validatePassword, validateName } from './validation.js';
import { clearStatus, setStatus, showToast } from './ui.js';

function sortProducts(products, sortValue) {
  const sorted = [...products];

  switch (sortValue) {
    case 'price-asc':
      return sorted.sort((a, b) => Number(a.price) - Number(b.price));
    case 'price-desc':
      return sorted.sort((a, b) => Number(b.price) - Number(a.price));
    case 'year-desc':
      return sorted.sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
    case 'mileage-asc':
      return sorted.sort((a, b) => extractMileage(a.mileage) - extractMileage(b.mileage));
    default:
      return sorted.sort((a, b) => Number(b.id) - Number(a.id));
  }
}

function extractMileage(value) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return digits ? Number.parseInt(digits, 10) : Number.MAX_SAFE_INTEGER;
}

function buildCatalogState(form) {
  const formData = new FormData(form);
  return {
    search: String(formData.get('search') || '').trim().toLowerCase(),
    body: String(formData.get('body') || '').trim(),
    year: String(formData.get('year') || '').trim(),
    sort: String(formData.get('sort') || 'featured').trim()
  };
}

function filterProducts(products, state) {
  return products.filter(product => {
    const matchesSearch = !state.search || [product.name, product.body, product.engine, product.description]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(state.search));
    const matchesBody = !state.body || product.body === state.body;
    const matchesYear = !state.year || String(product.year || '') === state.year;
    return matchesSearch && matchesBody && matchesYear;
  });
}

function fillSelectOptions(select, values, defaultLabel) {
  if (!select) return;

  const options = [`<option value="">${defaultLabel}</option>`]
    .concat(values.map(value => `<option value="${value}">${value}</option>`));
  select.innerHTML = options.join('');
}

function updateCatalogSummary(element, count, total) {
  if (!element) return;

  if (!total) {
    element.textContent = 'Автомобили пока не добавлены.';
    return;
  }

  element.textContent = count === total
    ? `Показываем все ${total} авто в наличии`
    : `Найдено ${count} из ${total} автомобилей`;
}

function initAuthTabs() {
  const tabsRoot = document.querySelector('.tabs');
  if (!tabsRoot) return;

  const buttons = [...tabsRoot.querySelectorAll('.tab-btn[data-tab]')];
  const panels = [...document.querySelectorAll('.tab-content')];
  const statuses = [...document.querySelectorAll('.form-status[data-auth-status]')];

  const activateTab = (tabId) => {
    buttons.forEach(button => {
      button.classList.toggle('active', button.dataset.tab === tabId);
    });

    panels.forEach(panel => {
      panel.classList.toggle('active', panel.id === tabId);
    });

    statuses.forEach(clearStatus);
  };

  buttons.forEach(button => {
    button.addEventListener('click', () => activateTab(button.dataset.tab));
  });
}

async function initCatalogPage() {
  const container = document.querySelector('.catalog-grid');
  const form = document.getElementById('catalogFilters');
  if (!container || !form) return;

  const summary = document.getElementById('catalogResultsSummary');
  const bodySelect = form.querySelector('[name="body"]');
  const yearSelect = form.querySelector('[name="year"]');

  try {
    const products = await getProducts();
    const bodies = [...new Set(products.map(product => product.body).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
    const years = [...new Set(products.map(product => product.year).filter(Boolean))]
      .sort((a, b) => Number(b) - Number(a))
      .map(value => String(value));

    fillSelectOptions(bodySelect, bodies, 'Любой кузов');
    fillSelectOptions(yearSelect, years, 'Любой год');

    const renderCatalog = () => {
      const state = buildCatalogState(form);
      const filtered = sortProducts(filterProducts(products, state), state.sort);
      updateCatalogSummary(summary, filtered.length, products.length);
      renderProductList(container, filtered, {
        emptyMessage: 'По этим параметрам машин пока нет. Попробуйте убрать часть фильтров.'
      });
    };

    form.addEventListener('input', renderCatalog);
    form.addEventListener('change', renderCatalog);
    form.addEventListener('reset', () => {
      window.requestAnimationFrame(renderCatalog);
    });

    renderCatalog();
  } catch (error) {
    console.error('Error loading catalog:', error);
    container.innerHTML = '<div class="error-message">Не удалось загрузить каталог. Попробуйте обновить страницу.</div>';
    updateCatalogSummary(summary, 0, 0);
  }
}

async function initFeaturedShowcase() {
  const container = document.querySelector('.featured-grid');
  if (!container) return;

  const products = await getProducts();
  renderProductList(container, products.slice(0, 4));
}

function bindStatusReset(form, statusElement) {
  if (!form || !statusElement) return;
  form.addEventListener('input', () => clearStatus(statusElement));
}

function scheduleRedirect(url) {
  window.setTimeout(() => {
    window.location.href = url;
  }, 650);
}

async function initAuthForms() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginStatus = document.getElementById('login-status');
  const registerStatus = document.getElementById('register-status');

  bindStatusReset(loginForm, loginStatus);
  bindStatusReset(registerForm, registerStatus);

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const login = loginForm.login.value.trim();
      const password = loginForm.password.value;
      const loginError = validateLogin(login);
      const passwordError = validatePassword(password);

      if (loginError || passwordError) {
        setStatus(loginStatus, [loginError, passwordError].filter(Boolean).join(' '), 'error');
        return;
      }

      setStatus(loginStatus, 'Проверяем данные и выполняем вход...', 'pending');
      const result = await loginUser(login, password);

      if (result.success) {
        setStatus(loginStatus, `Вход выполнен. Добро пожаловать, ${result.user.name}.`, 'success');
        showToast(`Вход выполнен: ${result.user.name}`, 'success');
        scheduleRedirect(result.user.role === 'admin' ? 'admin.html' : 'index.html');
        return;
      }

      setStatus(loginStatus, result.error, 'error');
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const name = registerForm.name.value.trim();
      const login = registerForm.login.value.trim();
      const password = registerForm.password.value;
      const nameError = validateName(name);
      const loginError = validateLogin(login);
      const passwordError = validatePassword(password);

      if (nameError || loginError || passwordError) {
        setStatus(registerStatus, [nameError, loginError, passwordError].filter(Boolean).join(' '), 'error');
        return;
      }

      setStatus(registerStatus, 'Создаем аккаунт...', 'pending');
      const result = await registerUser({ name, login, password });

      if (result.success) {
        setStatus(registerStatus, `Регистрация прошла успешно. Добро пожаловать, ${result.user.name}.`, 'success');
        showToast(`Аккаунт создан: ${result.user.name}`, 'success');
        scheduleRedirect('index.html');
        return;
      }

      setStatus(registerStatus, result.error, 'error');
    });
  }
}

function wireLogoutLink(link) {
  if (!link) return;

  const replacement = link.cloneNode(true);
  link.replaceWith(replacement);
  replacement.addEventListener('click', (event) => {
    event.preventDefault();
    logout();
    showToast('Вы вышли из аккаунта.', 'info');
    window.location.href = 'auth.html';
  });
}

function showUserInHeader() {
  const user = getCurrentUser();
  const nav = document.querySelector('.nav');
  if (!nav) return;

  const authLink = nav.querySelector('a[href="auth.html"]');
  nav.querySelector('.header-account')?.remove();
  nav.querySelector('.user-name')?.remove();
  nav.querySelector('a[href="admin.html"]')?.remove();

  if (!user) {
    if (authLink) {
      authLink.textContent = 'Вход / Регистрация';
      authLink.classList.add('btn-small');
      authLink.classList.remove('logout-link');
      nav.appendChild(authLink);
    }
    return;
  }

  const account = document.createElement('div');
  account.className = 'header-account';

  const userBadge = document.createElement('span');
  userBadge.className = 'user-name';
  userBadge.textContent = user.name;
  account.appendChild(userBadge);

  if (user.role === 'admin') {
    const adminLink = document.createElement('a');
    adminLink.href = 'admin.html';
    adminLink.textContent = 'Админка';
    adminLink.className = 'btn-small';
    account.appendChild(adminLink);
  }

  if (authLink) {
    authLink.textContent = 'Выход';
    authLink.classList.remove('btn-small');
    authLink.classList.add('logout-link');
    account.appendChild(authLink);
  }

  nav.appendChild(account);

  if (authLink) {
    wireLogoutLink(authLink);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initAuthTabs();
  initCatalogPage();
  initFeaturedShowcase();
  initAuthForms();
  showUserInHeader();
});

