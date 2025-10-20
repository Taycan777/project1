// API service for working with server endpoints
const API_BASE = 'http://localhost:3000/api';

// Generic API request function
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

// Products API
export async function getProducts() {
  return await apiRequest('/products');
}

export async function getProduct(id) {
  return await apiRequest(`/products/${id}`);
}

export async function createProduct(productData) {
  return await apiRequest('/products', {
    method: 'POST',
    body: JSON.stringify(productData)
  });
}

export async function updateProduct(id, productData) {
  return await apiRequest(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(productData)
  });
}

export async function deleteProduct(id) {
  return await apiRequest(`/products/${id}`, {
    method: 'DELETE'
  });
}

// Users API
export async function getUsers() {
  return await apiRequest('/users');
}

export async function createUser(userData) {
  return await apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
}

export async function updateUser(id, userData) {
  return await apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  });
}

export async function deleteUser(id) {
  return await apiRequest(`/users/${id}`, {
    method: 'DELETE'
  });
}

// Auth API
export async function loginUser(login, password) {
  return await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login, password })
  });
}

// Legacy functions for backward compatibility
export async function loadJSON(path) {
  if (path === 'data/products.json') {
    return await getProducts();
  } else if (path === 'data/users.json') {
    return await getUsers();
  }
  throw new Error('Unknown path: ' + path);
}

export function saveToLocal(path, data) {
  // This function is now deprecated, data is saved via API
  console.warn('saveToLocal is deprecated, use API functions instead');
}
