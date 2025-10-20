import { getUsers, createUser, updateUser, deleteUser, getProducts, createProduct, updateProduct, deleteProduct } from './dataService.js';

let users = [];
let products = [];

const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalForm = document.getElementById('modalForm');
const modalFields = document.getElementById('modalFields');
const closeModalBtn = document.getElementById('closeModalBtn');

async function initAdmin() {
  try {
    users = await getUsers();
    products = await getProducts();
    renderUsers();
    renderProducts();

    document.getElementById('addUserBtn').addEventListener('click', () => openUserModal());
    document.getElementById('addProductBtn').addEventListener('click', () => openProductModal());
    closeModalBtn.addEventListener('click', closeModal);
    modalForm.addEventListener('submit', onModalSubmit);
  } catch (error) {
    console.error('Error initializing admin:', error);
    alert('Ошибка загрузки данных: ' + error.message);
  }
}

// ---------------- USERS ----------------
function renderUsers() {
  const table = document.getElementById('usersTable');
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
  table.querySelectorAll('.edit-user').forEach(b => b.addEventListener('click', e => {
    const id = Number(e.currentTarget.dataset.id);
    const user = users.find(u => u.id === id);
    openUserModal(user);
  }));
  table.querySelectorAll('.del-user').forEach(b => b.addEventListener('click', async e => {
    const id = Number(e.currentTarget.dataset.id);
    if(confirm('Удалить пользователя?')) {
      try {
        await deleteUser(id);
        users = users.filter(u => u.id !== id);
        renderUsers();
      } catch (error) {
        alert('Ошибка удаления пользователя: ' + error.message);
      }
    }
  }));
}

function openUserModal(user={}) {
  modalOverlay.classList.remove('hidden');
  modalTitle.textContent = user.id ? 'Редактировать пользователя' : 'Добавить пользователя';
  modalForm.dataset.type = 'user';
  modalForm.dataset.id = user.id || '';
  modalFields.innerHTML = `
    <input name="name" placeholder="Имя" value="${user.name||''}" required>
    <input name="login" type="email" placeholder="Email" value="${user.login||''}" required>
    <select name="role">
      <option value="user" ${user.role==='user'?'selected':''}>User</option>
      <option value="admin" ${user.role==='admin'?'selected':''}>Admin</option>
    </select>
  `;
}

function openProductModal(prod={}) {
  modalOverlay.classList.remove('hidden');
  modalTitle.textContent = prod.id ? 'Редактировать товар' : 'Добавить товар';
  modalForm.dataset.type = 'product';
  modalForm.dataset.id = prod.id || '';
  modalFields.innerHTML = `
    <input name="name" placeholder="Название" value="${prod.name||''}" required>
    <input name="price" type="number" placeholder="Цена" value="${prod.price||''}" required>
    <input name="year" type="number" placeholder="Год" value="${prod.year||''}">
    <input name="mileage" placeholder="Пробег" value="${prod.mileage||''}">
    <input name="body" placeholder="Тип кузова" value="${prod.body||''}">
    <input name="engine" placeholder="Двигатель" value="${prod.engine||''}">
    <input name="acceleration" placeholder="Разгон до 100 км/ч" value="${prod.acceleration||''}">
    <input name="description" placeholder="Описание" value="${prod.description||''}">
    <input name="image" type="file" accept="image/*" placeholder="Изображение">
    <input name="imageUrl" placeholder="Или URL изображения" value="${prod.image||''}">
  `;
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  modalForm.dataset.id = '';
  modalForm.dataset.type = '';
}

// ---------------- SUBMIT MODAL ----------------
async function onModalSubmit(e) {
  e.preventDefault();
  const type = modalForm.dataset.type;
  const id = modalForm.dataset.id;
  const formData = new FormData(modalForm);
  
  try {
    if(type==='user') {
      const userData = {
        name: formData.get('name'),
        login: formData.get('login'),
        role: formData.get('role'),
        password: id ? users.find(u=>u.id==id).password : 'changeme'
      };
      
      if(id) {
        const updatedUser = await updateUser(id, userData);
        const idx = users.findIndex(u=>u.id==id);
        users[idx] = updatedUser;
      } else {
        const newUser = await createUser(userData);
        users.push(newUser);
      }
      renderUsers();
    } else if(type==='product') {
      const prodData = {
        name: formData.get('name'),
        price: Number(formData.get('price')),
        year: formData.get('year'),
        mileage: formData.get('mileage'),
        body: formData.get('body'),
        engine: formData.get('engine'),
        acceleration: formData.get('acceleration'),
        description: formData.get('description'),
        image: formData.get('imageUrl') || ''
      };
      
      // Handle file upload
      const imageFile = formData.get('image');
      if (imageFile && imageFile.size > 0) {
        const uploadFormData = new FormData();
        uploadFormData.append('image', imageFile);
        Object.keys(prodData).forEach(key => {
          if (key !== 'image') {
            uploadFormData.append(key, prodData[key]);
          }
        });
        
        const response = await fetch(`http://localhost:3000/api/products${id ? `/${id}` : ''}`, {
          method: id ? 'PUT' : 'POST',
          body: uploadFormData
        });
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки изображения');
        }
        
        const updatedProduct = await response.json();
        
        if(id) {
          const idx = products.findIndex(p=>p.id==id);
          products[idx] = updatedProduct;
        } else {
          products.push(updatedProduct);
        }
      } else {
        if(id) {
          const updatedProduct = await updateProduct(id, prodData);
          const idx = products.findIndex(p=>p.id==id);
          products[idx] = updatedProduct;
        } else {
          const newProduct = await createProduct(prodData);
          products.push(newProduct);
        }
      }
      renderProducts();
    }
    closeModal();
  } catch (error) {
    alert('Ошибка сохранения: ' + error.message);
  }
}

// ---------------- PRODUCTS ----------------
function renderProducts() {
  const table = document.getElementById('productsTable');
  table.innerHTML = `
    <tr><th>id</th><th>Название</th><th>Цена</th><th>Год</th><th>Пробег</th><th>Кузов</th><th>Действия</th></tr>
    ${products.map(p => `
      <tr data-id="${p.id}">
        <td>${p.id}</td>
        <td>${p.name}</td>
        <td>${p.price.toLocaleString()}</td>
        <td>${p.year||''}</td>
        <td>${p.mileage||''}</td>
        <td>${p.body||''}</td>
        <td>
          <button class="btn edit-prod" data-id="${p.id}">✏️</button>
          <button class="btn-outline del-prod" data-id="${p.id}">🗑️</button>
        </td>
      </tr>
    `).join('')}
  `;
  table.querySelectorAll('.edit-prod').forEach(b => b.addEventListener('click', e => {
    const id = Number(e.currentTarget.dataset.id);
    const prod = products.find(p=>p.id===id);
    openProductModal(prod);
  }));
  table.querySelectorAll('.del-prod').forEach(b => b.addEventListener('click', async e => {
    const id = Number(e.currentTarget.dataset.id);
    if(confirm('Удалить товар?')){
      try {
        await deleteProduct(id);
        products = products.filter(p=>p.id!==id);
        renderProducts();
      } catch (error) {
        alert('Ошибка удаления товара: ' + error.message);
      }
    }
  }));
}

document.addEventListener('DOMContentLoaded', initAdmin);

