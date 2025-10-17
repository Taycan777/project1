import { loadJSON, saveToLocal } from './dataService.js';

async function initAdmin() {
  // load (will be saved to localStorage if first time)
  const users = await loadJSON('data/users.json');
  const products = await loadJSON('data/products.json');

  // render
  renderUsers(users);
  renderProducts(products);

  // handlers
  document.getElementById('addUserBtn').addEventListener('click', () => openUserEditor());
  document.getElementById('addProductBtn').addEventListener('click', () => openProductEditor());
}

function renderUsers(users) {
  const table = document.getElementById('usersTable');
  if (!table) return;
  table.innerHTML = `
    <tr><th>id</th><th>Имя</th><th>Логин</th><th>Роль</th><th>Действия</th></tr>
    ${users.map(u => `
      <tr data-id="${u.id}">
        <td>${u.id}</td>
        <td>${u.name}</td>
        <td>${u.login}</td>
        <td>${u.role}</td>
        <td>
          <button class="btn edit-user" data-id="${u.id}">✏️</button>
          <button class="btn-outline del-user" data-id="${u.id}">🗑️</button>
        </td>
      </tr>
    `).join('')}
  `;
  // attach listeners
  table.querySelectorAll('.edit-user').forEach(b => b.addEventListener('click', e => {
    const id = Number(e.currentTarget.dataset.id);
    editUser(id);
  }));
  table.querySelectorAll('.del-user').forEach(b => b.addEventListener('click', e => {
    const id = Number(e.currentTarget.dataset.id);
    deleteUser(id);
  }));
}

function renderProducts(products) {
  const table = document.getElementById('productsTable');
  if (!table) return;
  table.innerHTML = `
    <tr><th>id</th><th>Название</th><th>Цена</th><th>Год</th><th>Действия</th></tr>
    ${products.map(p => `
      <tr data-id="${p.id}">
        <td>${p.id}</td>
        <td>${p.name}</td>
        <td>${p.price.toLocaleString()}</td>
        <td>${p.year || ''}</td>
        <td>
          <button class="btn edit-prod" data-id="${p.id}">✏️</button>
          <button class="btn-outline del-prod" data-id="${p.id}">🗑️</button>
        </td>
      </tr>
    `).join('')}
  `;
  table.querySelectorAll('.edit-prod').forEach(b => b.addEventListener('click', e => {
    const id = Number(e.currentTarget.dataset.id);
    editProduct(id);
  }));
  table.querySelectorAll('.del-prod').forEach(b => b.addEventListener('click', e => {
    const id = Number(e.currentTarget.dataset.id);
    deleteProduct(id);
  }));
}

// helpers to get and save DB from localStorage (mirror of dataService keys)
function getLocal(keyPath) {
  const raw = localStorage.getItem('db:' + keyPath);
  return raw ? JSON.parse(raw) : null;
}
function setLocal(keyPath, data) {
  localStorage.setItem('db:' + keyPath, JSON.stringify(data));
  // re-render to reflect changes
  if (keyPath === 'data/users.json') renderUsers(data);
  if (keyPath === 'data/products.json') renderProducts(data);
}

// CRUD user
function openUserEditor(user = {}) {
  const name = prompt('Имя:', user.name || '');
  if (name === null) return;
  const login = prompt('Логин (email):', user.login || '');
  if (login === null) return;
  const role = prompt('Роль (admin/user):', user.role || 'user');
  if (role === null) return;
  const users = getLocal('data/users.json') || [];
  if (user.id) {
    // update
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx].name = name;
      users[idx].login = login;
      users[idx].role = role;
    }
  } else {
    const id = users.length ? Math.max(...users.map(u=>u.id)) + 1 : 1;
    users.push({ id, name, login, password: 'changeme', role });
  }
  setLocal('data/users.json', users);
}

function editUser(id) {
  const users = getLocal('data/users.json') || [];
  const user = users.find(u => u.id === id);
  if (!user) return alert('Пользователь не найден');
  openUserEditor(user);
}

function deleteUser(id) {
  if (!confirm('Удалить пользователя?')) return;
  let users = getLocal('data/users.json') || [];
  users = users.filter(u => u.id !== id);
  setLocal('data/users.json', users);
}

// CRUD products
function openProductEditor(prod = {}) {
  const name = prompt('Название:', prod.name || '');
  if (name === null) return;
  const priceStr = prompt('Цена (число):', prod.price || '');
  if (priceStr === null) return;
  const price = Number(priceStr.replace(/\s/g,''));
  const year = prompt('Год:', prod.year || '');
  const image = prompt('URL изображения:', prod.image || '');
  const products = getLocal('data/products.json') || [];
  if (prod.id) {
    const idx = products.findIndex(p => p.id === prod.id);
    if (idx >= 0) {
      products[idx].name = name;
      products[idx].price = price;
      products[idx].year = year;
      products[idx].image = image;
    }
  } else {
    const id = products.length ? Math.max(...products.map(p=>p.id)) + 1 : 1;
    products.push({ id, name, price, year, image, description: '' });
  }
  setLocal('data/products.json', products);
}

function editProduct(id) {
  const products = getLocal('data/products.json') || [];
  const prod = products.find(p => p.id === id);
  if (!prod) return alert('Товар не найден');
  openProductEditor(prod);
}

function deleteProduct(id) {
  if (!confirm('Удалить товар?')) return;
  let products = getLocal('data/products.json') || [];
  products = products.filter(p => p.id !== id);
  setLocal('data/products.json', products);
}

// initial copy from file-storage to localStorage (in case admin opened direct)
async function ensureLocalFromFile() {
  // if no local copy, trigger load by calling loadJSON in dataService (fetch done earlier on page)
  // simpler approach: try to read local; if null => fetch files via fetch and save
  if (!getLocal('data/users.json')) {
    const u = await fetch('data/users.json').then(r=>r.json());
    setLocal('data/users.json', u);
  }
  if (!getLocal('data/products.json')) {
    const p = await fetch('data/products.json').then(r=>r.json());
    setLocal('data/products.json', p);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await ensureLocalFromFile();
  initAdmin();
});
