// Утилиты
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  let res = '';
  if (hours > 0) res += `${hours}ч `;
  if (mins > 0) res += `${mins} мин`;
  return res.trim() || '0 мин';
}

function getTicketStatus(status) {
  const map = { paid: 'оплачен', reserved: 'забронирован', refunded: 'возвращён', used: 'использован' };
  return map[status] || status;
}

// Логика приложения
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('content-container');
  
  const tabs = {
    films: document.getElementById('tab-films'),
    sessions: document.getElementById('tab-sessions'),
    profile: document.getElementById('tab-profile'),
    about: document.getElementById('tab-about')
  };

  function clearContainer(title) {
    container.innerHTML = `<h1>${title}</h1>`;
  }

  // Загрузка фильмов
  async function loadFilms() {
    clearContainer('Сейчас в кино');
    try {
      const res = await fetch('/api/films');
      const films = await res.json();
      films.forEach(film => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
          <h2>${film.name} (${film.year})</h2>
          <p>${film.description}</p>
          <p><strong>Режиссёр:</strong> ${film.director}</p>
          <p><strong>Жанры:</strong> ${film.genres || 'Не указаны'}</p>
          <p><strong>Длительность:</strong> ${formatDuration(film.duration)}</p>
        `;
        div.style.cursor = 'pointer';
        div.addEventListener('click', () => loadSessions(film.film_id));
        container.appendChild(div);
      });
    } catch (err) {
      container.innerHTML += '<p>Ошибка загрузки фильмов.</p>';
      console.error(err);
    }
  }

  // Загрузка сеансов (с фильтром по filmId)
  async function loadSessions(filmId = null) {
    clearContainer('Сеансы');
    try {
      const url = filmId ? `/api/sessions?film_id=${filmId}` : '/api/sessions';
      const res = await fetch(url);
      const sessions = await res.json();
      
      if (sessions.length === 0) {
        container.innerHTML += '<p>Сеансы не найдены.</p>';
        return;
      }

      sessions.forEach(session => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
          <h2>${session.film_name}</h2>
          <p><strong>Дата:</strong> ${formatDate(session.date)}</p>
          <p><strong>Время:</strong> ${session.s_time.slice(0,5)} - ${session.end_time.slice(0,5)}</p>
          <p><strong>Зал:</strong> ${session.hall_type}</p>
          <p><strong>Цена:</strong> ${session.price} ₽</p>
        `;
        div.style.cursor = 'pointer';
        div.addEventListener('click', () => openTicketPurchase(session.session_id));
        container.appendChild(div);
      });
    } catch (err) {
      container.innerHTML += '<p>Ошибка загрузки сеансов.</p>';
      console.error(err);
    }
  }

  // Покупка билета
  async function openTicketPurchase(sessionId) {
    clearContainer('Покупка билета');
    let freeSeats = [];
    try {
      const res = await fetch(`/api/sessions/${sessionId}/seats`);
      const data = await res.json();
      freeSeats = data.freeSeats;
    } catch {
      container.innerHTML = '<p>Ошибка загрузки мест</p>';
      return;
    }

    if (freeSeats.length === 0) {
      container.innerHTML = '<p>На этот сеанс нет свободных мест.</p>';
      return;
    }

    const form = document.createElement('form');
    form.innerHTML = `
      <label>ФИО:<br><input type="text" name="name" required></label>
      <label>Телефон:<br><input type="tel" name="phone" required></label>
      <label>Email:<br><input type="email" name="email" required></label>
      <label>Место:<br>
        <select name="seat" required>
          ${freeSeats.map(s => `<option value="${s}">Место ${s}</option>`).join('')}
        </select>
      </label>
      <button type="submit">Забронировать</button>
    `;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        session_id: sessionId,
        client_name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        email: form.email.value.trim(),
        seat: parseInt(form.seat.value)
      };

      try {
        const res = await fetch('/api/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (res.ok) {
          container.innerHTML = `
            <h2>Билет забронирован</h2>
            <p>Номер билета: <strong>${result.ticket_id}</strong></p>
            <button id="pay-btn">Оплатить билет</button>
          `;
          document.getElementById('pay-btn').addEventListener('click', async () => {
            const payRes = await fetch('/api/payments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ticket_id: result.ticket_id })
            });
            if (payRes.ok) {
              container.innerHTML = `<h2>Билет оплачен</h2><p>Спасибо за покупку!</p>`;
            } else {
              alert('Ошибка оплаты');
            }
          });
        } else {
          alert(result.message || 'Ошибка бронирования');
        }
      } catch (err) {
        console.error(err);
        alert('Ошибка сервера');
      }
    });

    container.appendChild(form);
  }

  // Личный кабинет
  async function loadProfile() {
    clearContainer('Личный кабинет');
    const form = document.createElement('form');
    form.innerHTML = `
      <label>ФИО:<br><input type="text" name="name" required></label>
      <label>Телефон:<br><input type="tel" name="phone" required></label>
      <label>Email:<br><input type="email" name="email" required></label>
      <button type="submit">Показать мои билеты</button>
    `;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const phone = form.phone.value.trim();
      const email = form.email.value.trim();

      try {
        const res = await fetch(`/api/client/info?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}&email=${encodeURIComponent(email)}`);
        if (!res.ok) {
          container.innerHTML = '<p>Клиент не найден.</p>';
          return;
        }
        const { client, tickets } = await res.json();
        renderProfile(client, tickets);
      } catch (err) {
        console.error(err);
        container.innerHTML = '<p>Ошибка сервера.</p>';
      }
    });
    container.appendChild(form);
  }

  function renderProfile(client, tickets) {
    container.innerHTML = `
      <h2>Профиль клиента</h2>
      <p><strong>Имя:</strong> ${client.name}</p>
      <p><strong>Телефон:</strong> ${client.phone}</p>
      <p><strong>Email:</strong> ${client.email}</p>
      <h3>Мои билеты</h3>
      <div class="ticket-list">
        ${tickets.map(t => `
          <div class="card ticket-card" data-id="${t.ticket_id}">
            <h4>${t.film_name}</h4>
            <p><strong>Дата:</strong> ${formatDate(t.date)} ${t.s_time.slice(0,5)}</p>
            <p><strong>Зал:</strong> ${t.hall_number}, Место: ${t.seat}</p>
            <p><strong>Статус:</strong> ${getTicketStatus(t.status)}</p>
            ${t.status === 'paid' ? `<button class="refund-btn" data-id="${t.ticket_id}">Вернуть билет</button>` : ''}
            ${t.status === 'reserved' ? `<button class="pay-btn" data-id="${t.ticket_id}">Оплатить</button>` : ''}
          </div>
        `).join('')}
      </div>
    `;

    document.querySelectorAll('.refund-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Вернуть билет?')) return;
        const res = await fetch(`/api/refund_ticket/${btn.dataset.id}`, { method: 'POST' });
        if (res.ok) {
          alert('Билет возвращён');
          loadProfile();
        } else {
          alert('Ошибка возврата');
        }
      });
    });

    document.querySelectorAll('.pay-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const res = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket_id: btn.dataset.id })
        });
        if (res.ok) {
          alert('Билет оплачен');
          loadProfile();
        } else {
          alert('Ошибка оплаты');
        }
      });
    });
  }

  // О нас
  async function loadAbout() {
    clearContainer('О Нас');
    try {
      const res = await fetch('/api/cinema');
      const cinema = await res.json();
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `
        <h2>Кинотеатр ${cinema.name}</h2>
        <p><strong>Адрес:</strong> ${cinema.address}</p>
        <p><strong>Телефон:</strong> ${cinema.phone}</p>
        <p><strong>Email:</strong> ${cinema.email}</p>
        <p><strong>Директор:</strong> ${cinema.director}</p>
        <p><strong>ИНН:</strong> ${cinema.inn}</p>
      `;
      container.appendChild(div);
    } catch (err) {
      container.innerHTML = '<p>Ошибка загрузки информации.</p>';
    }
  }

  // Привязка событий
  tabs.films.addEventListener('click', (e) => { e.preventDefault(); loadFilms(); });
  tabs.sessions.addEventListener('click', (e) => { e.preventDefault(); loadSessions(); });
  tabs.profile.addEventListener('click', (e) => { e.preventDefault(); loadProfile(); });
  tabs.about.addEventListener('click', (e) => { e.preventDefault(); loadAbout(); });

  // Начальная загрузка
  loadFilms();
});
