document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('admin-container');
  
  const tabs = {
    films: document.getElementById('tab-films'),
    sessions: document.getElementById('tab-sessions'),
    clients: document.getElementById('tab-clients'),
    cashiers: document.getElementById('tab-cashiers')
  };

  function clearContainer(title) {
    container.innerHTML = `<h1>${title}</h1>`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  }

  function getStatusText(status) {
    const map = { planned: 'запланирован', started: 'начался', completed: 'завершен', canceled: 'отменен', paid: 'оплачен', reserved: 'забронирован', refunded: 'возвращён' };
    return map[status] || status;
  }

  // Фильмы
  async function loadFilms() {
    clearContainer('Управление фильмами');
    try {
      const [filmsRes, dirsRes, genresRes] = await Promise.all([
        fetch('/api/admin/films'),
        fetch('/api/admin/directors'),
        fetch('/api/admin/genres')
      ]);
      const films = await filmsRes.json();
      const directors = await dirsRes.json();
      const genres = await genresRes.json();

      // Форма добавления
      const form = document.createElement('form');
      form.innerHTML = `
        <h2>Добавить фильм</h2>
        <label>Название:<br><input type="text" name="name" required></label>
        <label>Год:<br><input type="number" name="year" min="1900" max="2100" required></label>
        <label>Описание:<br><textarea name="description" rows="3" required></textarea></label>
        <label>Режиссёр:<br>
          <select name="director_id" required>
            <option value="">Выберите...</option>
            ${directors.map(d => `<option value="${d.director_id}">${d.name}</option>`).join('')}
          </select>
        </label>
        <label>Жанры (с Ctrl):<br>
          <select name="genres" multiple size="4" required>
            ${genres.map(g => `<option value="${g.genre_id}">${g.name}</option>`).join('')}
          </select>
        </label>
        <label>Длительность (мин):<br><input type="number" name="duration" min="1" required></label>
        <button type="submit">Добавить фильм</button>
      `;

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          name: form.name.value.trim(),
          year: parseInt(form.year.value),
          description: form.description.value.trim(),
          director_id: form.director_id.value,
          genres: Array.from(form.genres.selectedOptions).map(o => o.value),
          duration: parseInt(form.duration.value)
        };
        const res = await fetch('/api/admin/films', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          alert('Фильм добавлен');
          loadFilms();
        } else {
          alert('Ошибка добавления');
        }
      });
      container.appendChild(form);

      // Список фильмов
      films.forEach(film => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
          <h2>${film.name} (${film.year})</h2>
          <p><strong>Режиссёр:</strong> ${film.director}</p>
          <p><strong>Жанры:</strong> ${film.genres || 'Нет'}</p>
          <p><strong>Длительность:</strong> ${film.duration} мин.</p>
          <button class="delete-film" data-id="${film.film_id}">Удалить</button>
        `;
        div.querySelector('.delete-film').addEventListener('click', async () => {
          if (!confirm('Удалить фильм?')) return;
          const res = await fetch(`/api/films/${film.film_id}`, { method: 'DELETE' });
          if (res.ok) loadFilms();
          else alert('Ошибка удаления');
        });
        container.appendChild(div);
      });
    } catch (err) {
      container.innerHTML += '<p>Ошибка загрузки фильмов.</p>';
      console.error(err);
    }
  }

  // Сеансы
  async function loadSessions() {
    clearContainer('Управление сеансами');
    try {
      const [filmsRes, hallsRes, cashiersRes] = await Promise.all([
        fetch('/api/films'),
        fetch('/api/halls'),
        fetch('/api/cashiers')
      ]);
      const films = await filmsRes.json();
      const halls = await hallsRes.json();
      const cashiers = await cashiersRes.json();

      const form = document.createElement('form');
      form.innerHTML = `
        <h2>Добавить сеанс</h2>
        <label>Фильм:<br><select name="film_id" required>${films.map(f => `<option value="${f.film_id}">${f.name}</option>`).join('')}</select></label>
        <label>Зал:<br><select name="hall_id" required>${halls.map(h => `<option value="${h.hall_id}">Зал ${h.hall_id}</option>`).join('')}</select></label>
        <label>Кассир:<br><select name="cashier_id"><option value="">Не назначен</option>${cashiers.map(c => `<option value="${c.cashier_id}">${c.name}</option>`).join('')}</select></label>
        <label>Дата:<br><input type="date" name="date" required></label>
        <label>Начало:<br><input type="time" name="s_time" required></label>
        <label>Конец:<br><input type="time" name="end_time" required></label>
        <label>Цена:<br><input type="number" name="price" step="0.01" required></label>
        <button type="submit">Добавить сеанс</button>
      `;
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          film_id: form.film_id.value,
          hall_id: form.hall_id.value,
          cashier_id: form.cashier_id.value || null,
          date: form.date.value,
          s_time: form.s_time.value,
          end_time: form.end_time.value,
          price: parseFloat(form.price.value)
        };
        const res = await fetch('/api/admin/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) { alert('Сеанс добавлен'); loadSessions(); }
        else alert('Ошибка добавления');
      });
      container.appendChild(form);

      const res = await fetch('/api/admin/sessions');
      const sessions = await res.json();
      sessions.forEach(s => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
          <h2>${s.film_name}</h2>
          <p><strong>Дата:</strong> ${formatDate(s.date)} (${s.s_time.slice(0,5)} - ${s.end_time.slice(0,5)})</p>
          <p><strong>Зал:</strong> ${s.hall_number} (${s.hall_type_name})</p>
          <p><strong>Кассир:</strong> ${s.cashier_name || 'Не назначен'}</p>
          <p><strong>Цена:</strong> ${s.price} ₽</p>
          <p><strong>Статус:</strong> ${getStatusText(s.status)}</p>
          ${s.status === 'planned' ? `<button class="cancel-session" data-id="${s.session_id}">Отменить сеанс</button>` : ''}
        `;
        const btn = div.querySelector('.cancel-session');
        if (btn) {
          btn.addEventListener('click', async () => {
            if (!confirm('Отменить сеанс и вернуть деньги?')) return;
            const res = await fetch(`/api/admin/sessions/${s.session_id}/cancel`, { method: 'POST' });
            if (res.ok) { alert('Сеанс отменён'); loadSessions(); }
            else alert('Ошибка отмены');
          });
        }
        container.appendChild(div);
      });
    } catch (err) {
      container.innerHTML += '<p>Ошибка загрузки сеансов.</p>';
      console.error(err);
    }
  }

  // Клиенты
  async function loadClients() {
    clearContainer('Управление клиентами');
    try {
      const res = await fetch('/api/admin/clients');
      const clients = await res.json();
      
      const search = document.createElement('input');
      search.type = 'text';
      search.placeholder = 'Поиск по имени, телефону или email...';
      search.className = 'search-input';
      container.appendChild(search);

      const list = document.createElement('div');
      container.appendChild(list);

      function render(filtered) {
        list.innerHTML = '';
        if (!filtered.length) { list.innerHTML = '<p>Клиенты не найдены.</p>'; return; }
        filtered.forEach(c => {
          const div = document.createElement('div');
          div.className = 'card';
          div.innerHTML = `
            <h2>${c.name}</h2>
            <p><strong>Телефон:</strong> ${c.phone || '-'}</p>
            <p><strong>Email:</strong> ${c.email || '-'}</p>
            <button class="delete-client" data-id="${c.client_id}">Удалить</button>
          `;
          div.querySelector('.delete-client').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm('Удалить клиента?')) return;
            const res = await fetch(`/api/admin/clients/${c.client_id}`, { method: 'DELETE' });
            if (res.ok) loadClients();
            else alert('Ошибка удаления (возможно, есть билеты)');
          });
          list.appendChild(div);
        });
      }

      render(clients);
      search.addEventListener('input', () => {
        const q = search.value.toLowerCase();
        render(clients.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)) || (c.email && c.email.toLowerCase().includes(q))));
      });
    } catch (err) {
      container.innerHTML += '<p>Ошибка загрузки клиентов.</p>';
    }
  }

  // Кассиры
  async function loadCashiers() {
    clearContainer('Управление кассирами');
    try {
      const res = await fetch('/api/admin/cashiers');
      const cashiers = await res.json();
      
      const search = document.createElement('input');
      search.type = 'text';
      search.placeholder = 'Поиск по имени...';
      search.className = 'search-input';
      container.appendChild(search);

      const list = document.createElement('div');
      container.appendChild(list);

      function render(filtered) {
        list.innerHTML = '';
        if (!filtered.length) { list.innerHTML = '<p>Кассиры не найдены.</p>'; return; }
        filtered.forEach(c => {
          const div = document.createElement('div');
          div.className = 'card';
          div.innerHTML = `
            <h2>${c.name}</h2>
            <p><strong>Телефон:</strong> ${c.phone || '-'}</p>
            <button class="delete-cashier" data-id="${c.cashier_id}">Удалить</button>
          `;
          div.querySelector('.delete-cashier').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm('Удалить кассира?')) return;
            const res = await fetch(`/api/admin/cashiers/${c.cashier_id}`, { method: 'DELETE' });
            if (res.ok) loadCashiers();
            else alert('Ошибка удаления');
          });
          list.appendChild(div);
        });
      }

      render(cashiers);
      search.addEventListener('input', () => {
        const q = search.value.toLowerCase();
        render(cashiers.filter(c => c.name.toLowerCase().includes(q)));
      });
    } catch (err) {
      container.innerHTML += '<p>Ошибка загрузки кассиров.</p>';
    }
  }

  // Привязка событий
  tabs.films.addEventListener('click', (e) => { e.preventDefault(); loadFilms(); });
  tabs.sessions.addEventListener('click', (e) => { e.preventDefault(); loadSessions(); });
  tabs.clients.addEventListener('click', (e) => { e.preventDefault(); loadClients(); });
  tabs.cashiers.addEventListener('click', (e) => { e.preventDefault(); loadCashiers(); });

  // Начальная загрузка
  loadFilms();
});
