import { createUser, loginUser as apiLoginUser, logoutUser } from './dataService.js';
import { clearSession, getCurrentUser, persistSession } from './session.js';

export async function registerUser({ login, password, name }) {
  try {
    const response = await createUser({ login, password, name });
    persistSession(response.user, response.token);
    return { success: true, user: response.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function loginUser(login, password) {
  try {
    const response = await apiLoginUser(login, password);
    persistSession(response.user, response.token);
    return { success: true, user: response.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function logout() {
  clearSession();
  logoutUser().catch(() => {});
}

export { getCurrentUser };
