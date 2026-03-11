import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getProducts,
  createProduct,
  updateProduct,
  saveProductWithImage,
  deleteProduct
} from './dataService.js';
import { getCurrentUser, logout } from './auth.js';
import { escapeHtml, formatPrice } from './products.js';
import { confirmAction, showToast } from './ui.js';

let users = [];
let products = [];

const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalForm = document.getElementById('modalForm');
const modalFields = document.getElementById('modalFields');
const closeModalBtn = document.getElementById('closeModalBtn');

function escapeAttr(value = '') {
  return escapeHtml(String(value)).replace(/'/g, '&#39;');
}

function ensureAdminAccess() {
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    window.location.href = 'auth.html';
    return false;
  }
  return true;
}

function wireLogoutLink() {
  const logoutLink = document.querySelector('.nav a[href="auth.html"]');
  if (!logoutLink) return;

  const cleanLink = logoutLink.cloneNode(true);
  logoutLink.replaceWith(cleanLink);
  cleanLink.addEventListener('click', (event) => {
    event.preventDefault();
    logout();
    showToast('Вы вышли из админки.', 'info');
    window.location.href = 'auth.html';
  });
}

async function initAdmin() {
  if (!ensureAdminAccess()) {
    return;
  }

  wireLogoutLink();

  try {
    users = await getUsers();
    products = await getProducts();
    renderUsers();
    renderProducts();

    document.getElementById('addUserBtn')?.addEventListener('click', () => openUserModal());
    document.getElementById('addProductBtn')?.addEventListener('click', () => openProductModal());
    closeModalBtn?.addEventListener('click', closeModal);
    modalOverlay?.addEventListener('click', (event) => {
      if (event.target === modalOverlay) {
        closeModal();
      }
    });
    modalForm?.addEventListener('submit', onModalSubmit);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
        closeModal();
      }
    });
  } catch (error) {
    console.error('Error initializing admin:', error);
    showToast(`Ошибка загрузки данных: ${error.message}`, 'error', 4200);
    if (/Authentication required|Administrator access required/i.test(error.message)) {
      logout();
      window.location.href = 'auth.html';
    }
  }
}

function renderUsers() {
  const table = document.getElementById('usersTable');
  if (!table) return;

  table.innerHTML = `
    <tr><th>ID</th><th>Имя</th><th>Логин</th><th>Роль</th><th>Действия</th></tr>
    ${users.map(user => `
      <tr data-id="${user.id}">
        <td>${user.id}</td>
        <td>${escapeHtml(user.name)}</td>
        <td>${escapeHtml(user.login)}</td>
        <td>${escapeHtml(user.role)}</td>
        <td>
          <div class="admin-actions">
            <button class="btn edit-user" data-id="${user.id}">Ред.</button>
            <button class="btn-outline del-user" data-id="${user.id}">Удал.</button>
          </div>
        </td>
      </tr>
    `).join('')}
  `;

  table.querySelectorAll('.edit-user').forEach(button => button.addEventListener('click', event => {
    const id = Number(event.currentTarget.dataset.id);
    const user = users.find(item => item.id === id);
    openUserModal(user);
  }));

  table.querySelectorAll('.del-user').forEach(button => button.addEventListener('click', async event => {
    const id = Number(event.currentTarget.dataset.id);
    const user = users.find(item => item.id === id);
    const confirmed = await confirmAction({
      title: 'Удалить пользователя?',
      description: `Пользователь ${user?.name || ''} будет удален без возможности восстановления.`,
      confirmLabel: 'Удалить',
      danger: true
    });

    if (!confirmed) return;

    try {
      await deleteUser(id);
      users = users.filter(item => item.id !== id);
      renderUsers();
      showToast('Пользователь удален.', 'success');
    } catch (error) {
      showToast(`Ошибка удаления пользователя: ${error.message}`, 'error', 4200);
    }
  }));
}

function openUserModal(user = {}) {
  modalOverlay.classList.remove('hidden');
  modalTitle.textContent = user.id ? 'Редактировать пользователя' : 'Добавить пользователя';
  modalForm.dataset.type = 'user';
  modalForm.dataset.id = user.id || '';
  modalFields.innerHTML = `
    <input name="name" placeholder="Имя" value="${escapeAttr(user.name || '')}" required>
    <input name="login" type="email" placeholder="Email" value="${escapeAttr(user.login || '')}" required>
    <input name="password" type="password" placeholder="${user.id ? 'Новый пароль (необязательно)' : 'Пароль'}" ${user.id ? '' : 'required'}>
    <select name="role">
      <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
      <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
    </select>
  `;
}

function openProductModal(product = {}) {
  modalOverlay.classList.remove('hidden');
  modalTitle.textContent = product.id ? 'Редактировать товар' : 'Добавить товар';
  modalForm.dataset.type = 'product';
  modalForm.dataset.id = product.id || '';
  modalFields.innerHTML = `
    <input name="name" placeholder="Название" value="${escapeAttr(product.name || '')}" required>
    <input name="price" type="number" placeholder="Цена" value="${escapeAttr(product.price || '')}" required>
    <input name="year" type="number" placeholder="Год" value="${escapeAttr(product.year || '')}">
    <input name="mileage" placeholder="Пробег" value="${escapeAttr(product.mileage || '')}">
    <input name="body" placeholder="Тип кузова" value="${escapeAttr(product.body || '')}">
    <input name="engine" placeholder="Двигатель" value="${escapeAttr(product.engine || '')}">
    <input name="acceleration" placeholder="Разгон до 100 км/ч" value="${escapeAttr(product.acceleration || '')}">
    <textarea name="description" placeholder="Описание">${escapeHtml(product.description || '')}</textarea>
    <input name="image" type="file" accept="image/*" placeholder="Изображение">
    <input name="imageUrl" placeholder="Или URL изображения" value="${escapeAttr(product.image || '')}">
  `;
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  modalForm.reset();
  modalForm.dataset.id = '';
  modalForm.dataset.type = '';
  modalFields.innerHTML = '';
}

async function onModalSubmit(event) {
  event.preventDefault();
  const type = modalForm.dataset.type;
  const id = modalForm.dataset.id;
  const formData = new FormData(modalForm);

  try {
    if (type === 'user') {
      const password = String(formData.get('password') || '').trim();
      if (!id && !password) {
        throw new Error('Укажите пароль для нового пользователя');
      }

      const userData = {
        name: String(formData.get('name') || '').trim(),
        login: String(formData.get('login') || '').trim(),
        role: formData.get('role')
      };

      if (password) {
        userData.password = password;
      }

      if (id) {
        const updatedUser = await updateUser(id, userData);
        const index = users.findIndex(user => user.id === Number(id));
        users[index] = updatedUser;
        showToast('Пользователь обновлен.', 'success');
      } else {
        const newUser = await createUser(userData);
        users.push(newUser);
        showToast('Пользователь добавлен.', 'success');
      }

      renderUsers();
    }

    if (type === 'product') {
      const productData = {
        name: String(formData.get('name') || '').trim(),
        price: Number(formData.get('price')),
        year: String(formData.get('year') || '').trim(),
        mileage: String(formData.get('mileage') || '').trim(),
        body: String(formData.get('body') || '').trim(),
        engine: String(formData.get('engine') || '').trim(),
        acceleration: String(formData.get('acceleration') || '').trim(),
        description: String(formData.get('description') || '').trim(),
        image: String(formData.get('imageUrl') || '').trim()
      };

      const imageFile = formData.get('image');

      if (imageFile && imageFile.size > 0) {
        const savedProduct = await saveProductWithImage(id, productData, imageFile);
        if (id) {
          const index = products.findIndex(product => product.id === Number(id));
          products[index] = savedProduct;
          showToast('Товар обновлен вместе с изображением.', 'success');
        } else {
          products.push(savedProduct);
          showToast('Товар добавлен.', 'success');
        }
      } else if (id) {
        const updatedProduct = await updateProduct(id, productData);
        const index = products.findIndex(product => product.id === Number(id));
        products[index] = updatedProduct;
        showToast('Товар обновлен.', 'success');
      } else {
        const newProduct = await createProduct(productData);
        products.push(newProduct);
        showToast('Товар добавлен.', 'success');
      }

      renderProducts();
    }

    closeModal();
  } catch (error) {
    showToast(`Ошибка сохранения: ${error.message}`, 'error', 4200);
  }
}

function renderProducts() {
  const table = document.getElementById('productsTable');
  if (!table) return;

  table.innerHTML = `
    <tr><th>ID</th><th>Название</th><th>Цена</th><th>Год</th><th>Пробег</th><th>Кузов</th><th>Действия</th></tr>
    ${products.map(product => `
      <tr data-id="${product.id}">
        <td>${product.id}</td>
        <td>${escapeHtml(product.name)}</td>
        <td>${formatPrice(product.price)} руб.</td>
        <td>${escapeHtml(product.year || '')}</td>
        <td>${escapeHtml(product.mileage || '')}</td>
        <td>${escapeHtml(product.body || '')}</td>
        <td>
          <div class="admin-actions">
            <button class="btn edit-prod" data-id="${product.id}">Ред.</button>
            <button class="btn-outline del-prod" data-id="${product.id}">Удал.</button>
          </div>
        </td>
      </tr>
    `).join('')}
  `;

  table.querySelectorAll('.edit-prod').forEach(button => button.addEventListener('click', event => {
    const id = Number(event.currentTarget.dataset.id);
    const product = products.find(item => item.id === id);
    openProductModal(product);
  }));

  table.querySelectorAll('.del-prod').forEach(button => button.addEventListener('click', async event => {
    const id = Number(event.currentTarget.dataset.id);
    const product = products.find(item => item.id === id);
    const confirmed = await confirmAction({
      title: 'Удалить товар?',
      description: `Карточка «${product?.name || 'товар'}» будет удалена без возможности восстановления.`,
      confirmLabel: 'Удалить',
      danger: true
    });

    if (!confirmed) return;

    try {
      await deleteProduct(id);
      products = products.filter(item => item.id !== id);
      renderProducts();
      showToast('Товар удален.', 'success');
    } catch (error) {
      showToast(`Ошибка удаления товара: ${error.message}`, 'error', 4200);
    }
  }));
}

document.addEventListener('DOMContentLoaded', initAdmin);
