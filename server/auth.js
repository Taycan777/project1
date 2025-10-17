import { loadJSON, saveToLocal } from './dataService.js';

// helper: get users from localStorage (or from file)
export async function getUsers() {
  return await loadJSON('data/users.json');
}

export async function registerUser({ login, password, name }) {
  const users = await getUsers();
  if (users.find(u => u.login === login)) {
    return { success: false, error: 'Пользователь с таким логином уже существует' };
  }
  const id = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
  const user = { id, login, password, name, role: 'user' };
  users.push(user);
  saveToLocal('data/users.json', users);
  // сохранение безопасной копии currentUser (без пароля)
  const safe = { id: user.id, login: user.login, name: user.name, role: user.role };
  localStorage.setItem('currentUser', JSON.stringify(safe));
  return { success: true, user: safe };
}

export async function loginUser(login, password) {
  const users = await getUsers();
  const user = users.find(u => u.login === login && u.password === password);
  if (!user) return { success: false, error: 'Неверный логин или пароль' };
  const safe = { id: user.id, login: user.login, name: user.name, role: user.role };
  localStorage.setItem('currentUser', JSON.stringify(safe));
  return { success: true, user: safe };
}

export function logout() {
  localStorage.removeItem('currentUser');
}

export function getCurrentUser() {
  const raw = localStorage.getItem('currentUser');
  return raw ? JSON.parse(raw) : null;
}

