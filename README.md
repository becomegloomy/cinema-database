# Cinema Database

Full-stack приложение для управления кинотеатром: база данных MySQL, REST API на Node.js (Express) и веб-интерфейс для клиентов и администраторов.

## Возможности

**Для клиентов:**
- просмотр афиши и расписания сеансов;
- выбор места и бронирование билета;
- личный кабинет с историей билетов.

**Для администраторов:**
- добавление и удаление фильмов, режиссёров, жанров;
- управление сеансами и залами;
- назначение кассиров на сеансы;
- просмотр клиентов и их билетов, поиск, удаление.

## Технологии

- **База данных:** MySQL 8.0 (InnoDB), хранимые функции, процедуры и представления;
- **Backend:** Node.js, Express, `mysql2`, `dotenv`;
- **Frontend:** Vanilla JavaScript (ES6), HTML5, CSS3.

## Структура проекта

```text
cinema-database-management/
├── database/               # SQL-скрипты
│   ├── schema.sql          # Создание таблиц
│   ├── seed.sql            # Тестовые данные
│   ├── functions.sql       # Хранимые функции
│   ├── procedures.sql      # Хранимые процедуры
│   └── views.sql           # Представления
│
├── server/                 # Backend (Node.js + Express)
│   ├── app.js              # REST API маршруты
│   ├── db.js               # Подключение к MySQL
│   └── package.json
│
├── .env.example            # Пример конфигурации
│
└── client/                 # Frontend (HTML + CSS + JS)
    ├── index.html          # Интерфейс клиента
    ├── admin.html          # Интерфейс администратора
    ├── main.js             # Логика клиента
    ├── admin.js            # Логика админки
    └── style.css           # Общие стили
```

## Настройка и запуск сервера

```bash
cd server
cp .env.example .env     # Копирование примера конфигурации
```

Открыть `.env` и указать пароль от MySQL:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=пароль_от_mysql
DB_NAME=кинотеатр
PORT=3000
```

Установите зависимости и запустите сервер:
```bash
npm install
npm start
```
