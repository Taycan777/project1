import { createUser, loginUser as apiLoginUser } from './dataService.js';

export async function getUsers() {
  const { getUsers } = await import('./dataService.js');
  return await getUsers();
}

export async function registerUser({ login, password, name }) {
  try {
    const user = await createUser({ login, password, name });
    // сохранение безопасной копии currentUser (без пароля)
    localStorage.setItem('currentUser', JSON.stringify(user));
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function loginUser(login, password) {
  try {
    const user = await apiLoginUser(login, password);
    localStorage.setItem('currentUser', JSON.stringify(user));
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function logout() {
  localStorage.removeItem('currentUser');
}

export function getCurrentUser() {
  const raw = localStorage.getItem('currentUser');
  return raw ? JSON.parse(raw) : null;
}

