// server/main.js
import { validateForm } from './validation.js';
import { loginUser, registerUser, getCurrentUser, logoutUser } from './auth.js';
import { renderProductList, renderProductDetail } from './products.js';
import { getProducts } from './mockDB.js';

// Показываем имя пользователя в шапке (если есть)
function showUserInHeader() {
  const user = getCurrentUser();
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const existing = nav.querySelector('.user-name');
  if (existing) existing.remove();
  if (user) {
    const span = document.createElement('span');
    span.className = 'user-name';
    span.textContent = user.name;
    span.style.marginLeft = '14px';
    nav.appendChild(span);
  }
}

// Инициализация каталога на index.html
function initCatalog() {
  const container = document.querySelector('.grid');
  if (!container) return;
  renderProductList(container);
}

// Инициализация страницы продукта
function initProductPage() {
  const container = document.querySelector('.product-page__inner');
  if (!container) return;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (id) {
    renderProductDetail(container, id);
  } else {
    container.innerHTML = '<p>Автомобиль не выбран. Вернитесь в каталог.</p>';
  }
}

// Инициализация авторизации/регистрации
function initAuth() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      const login = form.login.value.trim();
      const password = form.password.value;
      const { isValid, loginError, passwordError } = validateForm({ login, password });
      if (!isValid) {
        alert((loginError ? loginError + '\n' : '') + (passwordError ? passwordError : ''));
        return;
      }
      const res = loginUser(login, password);
      if (res.success) {
        alert('Вход выполнен: ' + res.user.name);
        showUserInHeader();
        window.location.href = 'index.html';
      } else {
        alert(res.error);
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      const name = form.name.value.trim();
      const login = form.login.value.trim();
      const password = form.password.value;
      const { isValid, loginError, passwordError, nameError } = validateForm({ login, password, name });
      if (!isValid) {
        alert((nameError ? nameError + '\n' : '') + (loginError ? loginError + '\n' : '') + (passwordError ? passwordError : ''));
        return;
      }
      const res = registerUser({ login, password, name });
      if (res.success) {
        alert('Регистрация успешна: ' + res.user.name);
        showUserInHeader();
        window.location.href = 'index.html';
      } else {
        alert(res.error);
      }
    });
  }
}

// старт
document.addEventListener('DOMContentLoaded', () => {
  showUserInHeader();
  initCatalog();
  initProductPage();
  initAuth();
});
