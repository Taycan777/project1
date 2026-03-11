export function validateLogin(login) {
  if (!login || login.trim().length === 0) return 'Логин (email) обязателен';
  if (!/\S+@\S+\.\S+/.test(login)) return 'Неверный формат email';
  return null;
}

export function validatePassword(password) {
  if (!password || password.length === 0) return 'Пароль обязателен';
  if (password.length < 6) return 'Пароль должен быть не менее 6 символов';
  return null;
}

export function validateName(name) {
  if (!name || name.trim().length === 0) return 'Имя обязательно';
  return null;
}

