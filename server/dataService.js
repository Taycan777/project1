import { getAuthHeaders } from './session.js';

const API_BASE = '/api';

async function apiRequest(endpoint, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...getAuthHeaders(),
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function getProducts() {
  return apiRequest('/products');
}

export async function createProduct(productData) {
  return apiRequest('/products', {
    method: 'POST',
    body: JSON.stringify(productData)
  });
}

export async function updateProduct(id, productData) {
  return apiRequest(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(productData)
  });
}

export async function saveProductWithImage(id, productData, imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);

  Object.entries(productData).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  return apiRequest(`/products${id ? `/${id}` : ''}`, {
    method: id ? 'PUT' : 'POST',
    body: formData
  });
}

export async function deleteProduct(id) {
  return apiRequest(`/products/${id}`, {
    method: 'DELETE'
  });
}

export async function getUsers() {
  return apiRequest('/users');
}

export async function createUser(userData) {
  return apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
}

export async function updateUser(id, userData) {
  return apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  });
}

export async function deleteUser(id) {
  return apiRequest(`/users/${id}`, {
    method: 'DELETE'
  });
}

export async function loginUser(login, password) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login, password })
  });
}

export async function logoutUser() {
  return apiRequest('/auth/logout', {
    method: 'POST'
  });
}

export async function createInquiry(inquiryData) {
  return apiRequest('/inquiries', {
    method: 'POST',
    body: JSON.stringify(inquiryData)
  });
}
