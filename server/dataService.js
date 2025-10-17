// Загружает JSON (fetch) и возвращает данные.
// Кроме того, при первом запуске сохраняет данные в localStorage,
// чтобы далее CRUD можно было делать в браузере.
export async function loadJSON(path) {
  // localStorage key based on path
  const key = 'db:' + path;
  // если в localStorage уже есть данные — возвращаем их
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) { /* fallthrough */ }
  }
  // иначе загружаем с файла и кладём в localStorage
  const res = await fetch(path);
  if (!res.ok) throw new Error('Не удалось загрузить ' + path);
  const data = await res.json();
  localStorage.setItem(key, JSON.stringify(data));
  return data;
}

export function saveToLocal(path, data) {
  const key = 'db:' + path;
  localStorage.setItem(key, JSON.stringify(data));
}
