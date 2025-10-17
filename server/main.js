import { loadJSON } from './dataService.js';
import { renderProductList, renderProductDetail } from './products.js';
import { getCurrentUser, loginUser, registerUser } from './auth.js';
import { validateLogin, validatePassword, validateName } from './validation.js';

// ---------- catalog ----------
async function initCatalog() {
  const container = document.querySelector('.grid');
  if (!container) return;
  const products = await loadJSON('data/products.json');
  renderProductList(container, products);
}

// ---------- product page ----------
async function initProductPage() {
  const wrapper = document.querySelector('.product-page__inner');
  if (!wrapper) return;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const products = await loadJSON('data/products.json');
  const product = products.find(p => String(p.id) === String(id));
  renderProductDetail(wrapper, product);
}

// ---------- auth (forms) ----------
async function initAuthForms() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const login = loginForm.login.value.trim();
      const password = loginForm.password.value;
      const loginErr = validateLogin(login);
      const passErr = validatePassword(password);
      if (loginErr || passErr) {
        alert((loginErr ? loginErr + '\n' : '') + (passErr ? passErr : ''));
        return;
      }
      const res = await loginUser(login, password);
      if (res.success) {
        alert('Вход успешен, ' + res.user.name);
        window.location.href = 'index.html';
      } else {
        alert(res.error);
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = registerForm.name.value.trim();
      const login = registerForm.login.value.trim();
      const password = registerForm.password.value;
      const nameErr = validateName(name);
      const loginErr = validateLogin(login);
      const passErr = validatePassword(password);
      if (nameErr || loginErr || passErr) {
        alert((nameErr ? nameErr + '\n' : '') + (loginErr ? loginErr + '\n' : '') + (passErr ? passErr : ''));
        return;
      }
      const res = await registerUser({ name, login, password });
      if (res.success) {
        alert('Регистрация успешна, ' + res.user.name);
        window.location.href = 'index.html';
      } else {
        alert(res.error);
      }
    });
  }
}

// ---------- header user display ----------
function showUserInHeader() {
  const userRaw = localStorage.getItem('currentUser');
  const nav = document.querySelector('.nav');
  if (!nav) return;
  // remove existing user-name or admin link
  const existing = nav.querySelector('.user-name');
  if (existing) existing.remove();
  const adminLink = nav.querySelector('a[href="admin.html"]');
  if (adminLink) adminLink.remove();

  if (userRaw) {
    const user = JSON.parse(userRaw);
    const span = document.createElement('span');
    span.className = 'user-name';
    span.textContent = user.name;
    span.style.marginLeft = '14px';
    nav.appendChild(span);
    if (user.role === 'admin') {
      const link = document.createElement('a');
      link.href = 'admin.html';
      link.textContent = 'Админка';
      link.className = 'btn-small';
      nav.appendChild(link);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initCatalog();
  initProductPage();
  initAuthForms();
  showUserInHeader();
});

