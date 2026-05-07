# ⬡ PyCatalog

**Каталог Python проектов** — открытая платформа для размещения и поиска Python-проектов.

## 🚀 Возможности

- ⚡ Быстрый поиск по типу, тегам и ключевым словам
- 📦 Скачивание ZIP-архивов одной кнопкой (хранение на GitHub)
- ⭐ Система избранного (облачная синхронизация)
- 💬 Комментарии к проектам
- 🛡️ Модерация проектов администраторами
- 🎫 Система тикетов поддержки
- 👑 Три уровня доступа: Пользователь / Администратор / Главный Администратор
- 🌙 Тёмная и светлая темы

---

## ⚙️ Установка и настройка

### 1. Firebase

1. Зайдите в [Firebase Console](https://console.firebase.google.com)
2. Создайте проект или используйте существующий
3. Включите **Authentication** → Email/Password
4. Включите **Firestore Database**
5. Скопируйте правила из `firestore.rules` в раздел Rules вашего Firestore

### 2. Назначение Главного Администратора

После первой регистрации на сайте:

1. Зайдите в Firebase Console → Firestore → коллекция `users`
2. Найдите документ вашего пользователя
3. Измените поле `role` с `"user"` на `"super_admin"`

### 3. Настройка GitHub репозитория

1. Создайте новый **публичный** репозиторий на GitHub (например, `pycatalog-files`)
2. Создайте **Personal Access Token** (Settings → Developer settings → PAT)
   - Нужны права: `repo` (полный доступ к репозиторию)
3. В панели администратора PyCatalog → Настройки → GitHub:
   - Введите логин, название репозитория, ветку и токен
4. **Токен хранится в Firestore и недоступен пользователям**

### 4. Деплой на GitHub Pages

1. Форкните или загрузите этот репозиторий на GitHub
2. Settings → Pages → Source: Deploy from branch → `main` → `/ (root)`
3. Сайт будет доступен по адресу `https://username.github.io/pycatalog`

---

## 📁 Структура проекта

```
pycatalog/
├── index.html              # Главная точка входа (SPA)
├── 404.html                # Редирект для GitHub Pages
├── firestore.rules         # Правила безопасности Firestore
├── assets/
│   └── favicon.svg
├── css/
│   ├── vars.css            # CSS-переменные (темы)
│   ├── base.css            # Базовые стили
│   ├── components.css      # UI компоненты
│   ├── layout.css          # Лейаут страниц
│   └── animations.css      # Анимации
└── js/
    ├── config.js           # Конфигурация приложения
    ├── auth.js             # Firebase аутентификация
    ├── router.js           # SPA роутер
    ├── ui.js               # UI утилиты
    ├── main.js             # Точка входа JS
    └── pages/
        ├── home.js
        ├── catalog.js
        ├── project-detail.js
        ├── add-project.js
        ├── login.js
        ├── register.js
        ├── forgot.js
        ├── profile.js
        ├── my-projects.js
        ├── favorites.js
        ├── support.js
        ├── about.js
        ├── pylaunch.js
        └── admin/
            ├── index.js
            ├── users.js
            ├── projects.js
            ├── tickets.js
            └── settings.js
```

---

## 🔒 Безопасность

- **GitHub PAT** хранится исключительно в Firestore (settings/app), защищён правилами — только super_admin имеет право записи
- **Firebase Config** — публичные ключи (нормальная практика), защита через Firestore Rules
- **Firestore Rules** — подробные правила на каждую коллекцию; пользователи не могут изменить свою роль или снять бан
- **Блокировка пользователей** — проверяется при каждом входе в систему
- **Пароли** — управляются Firebase Authentication, не хранятся на сайте

---

## 📜 Лицензия

MIT
