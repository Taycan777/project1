## Установка и запуск

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка Supabase

1. Файл .env находится в облаке, его необходимо скопировать и вставить в папку проекта.

```env
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
PORT=3000
```

### 3. Запуск сервера

```bash
# Режим разработки
npm run dev

# Продакшн режим
npm start
```

Сервер будет доступен по адресу: http://localhost:3000
