// server/auth.js
import { getUserByLogin, addUser } from './mockDB.js';

export function loginUser(login, password) {
  const user = getUserByLogin(login);
  if (user && user.password === password) {
    const safeUser = { id: user.id, login: user.login, name: user.name };
    localStorage.setItem('currentUser', JSON.stringify(safeUser));
    return { success: true, user: safeUser };
  }
  return { success: false, error: 'Неверный логин или пароль' };
}

export function registerUser({ login, password, name }) {
  if (getUserByLogin(login)) {
    return { success: false, error: 'Пользователь с таким логином уже существует' };
  }
  const newUser = { login, password, name };
  const created = addUser(newUser);
  const safeUser = { id: created.id, login: created.login, name: created.name };
  localStorage.setItem('currentUser', JSON.stringify(safeUser));
  return { success: true, user: safeUser };
}

export function logoutUser() {
  localStorage.removeItem('currentUser');
}

export function getCurrentUser() {
  const user = localStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
}
