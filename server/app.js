const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');

const app = express();

// Настройка путей к статичным файлам 
const clientPath = path.join(__dirname, '..', 'client');
const adminPath = path.join(__dirname, '..', 'client');

app.use(cors());
app.use(express.json());

app.use(express.static(clientPath));
app.use('/admin', express.static(adminPath));

// Маршруты для клиентов

app.get('/api/films', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        film.film_id, 
        film.name, 
        film.year, 
        film.description, 
        film.duration,
        director.name AS director,
        GROUP_CONCAT(DISTINCT genre.name SEPARATOR ', ') AS genres
      FROM film
      JOIN director ON film.director_id = director.director_id
      JOIN session ON film.film_id = session.film_id
      LEFT JOIN film_genre ON film.film_id = film_genre.film_id
      LEFT JOIN genre ON film_genre.genre_id = genre.genre_id
      WHERE session.status IN ('planned', 'started')
      GROUP BY film.film_id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

app.get('/api/sessions', async (req, res) => {
  const { film_id } = req.query;
  try {
    const [rows] = await pool.query(`
      SELECT 
        session.session_id,
        session.film_id,
        film.name AS film_name,
        session.date,
        session.s_time,
        session.end_time,
        hall_type.name AS hall_type,
        hall.seats,
        session.price,
        session.status
      FROM session
      JOIN film ON session.film_id = film.film_id
      JOIN hall ON session.hall_id = hall.hall_id
      JOIN hall_type ON hall.hall_type_id = hall_type.hall_type_id
      WHERE session.status IN ('planned', 'started')
      ${film_id ? ' AND session.film_id = ?' : ''}
      ORDER BY session.date, session.s_time
    `, film_id ? [film_id] : []);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

app.get('/api/cinema', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM cinema LIMIT 1`); 
    res.json(rows[0] || {}); 
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

app.get('/api/sessions/:sessionId/seats', async (req, res) => {
  const sessionId = req.params.sessionId;
  try {
    const [takenSeats] = await pool.query(
      `SELECT seat FROM ticket WHERE session_id = ?`, [sessionId]
    );
    const [[session]] = await pool.query(
      `SELECT hall.seats FROM session JOIN hall ON session.hall_id = hall.hall_id WHERE session.session_id = ?`, [sessionId]
    );

    if (!session) return res.status(404).json({ message: 'Сеанс не найден' });

    const allSeats = Array.from({ length: session.seats }, (_, i) => i + 1);
    const takenSeatsNumbers = takenSeats.map(row => row.seat);
    const freeSeats = allSeats.filter(seat => !takenSeatsNumbers.includes(seat));

    res.json({ freeSeats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.post('/api/tickets', async (req, res) => {
  const { session_id, client_name, phone, email, seat } = req.body;
  if (!session_id || !client_name || !phone || !email || !seat) {
    return res.status(400).json({ message: 'Все поля обязательны' });
  }

  try {
    let [clientRows] = await pool.query(
      `SELECT client_id FROM client WHERE name = ? AND phone = ? AND email = ? LIMIT 1`,
      [client_name, phone, email]
    );

    let client_id;
    if (clientRows.length > 0) {
      client_id = clientRows[0].client_id;
    } else {
      const [insertClient] = await pool.query(
        `INSERT INTO client (name, phone, email) VALUES (?, ?, ?)`,
        [client_name, phone, email]
      );
      client_id = insertClient.insertId;
    }

    const [seatCheck] = await pool.query(
      `SELECT ticket_id FROM ticket WHERE session_id = ? AND seat = ?`, [session_id, seat]
    );
    if (seatCheck.length > 0) {
      return res.status(400).json({ message: 'Место уже занято' });
    }

    const [insertTicket] = await pool.query(
      `INSERT INTO ticket (session_id, client_id, seat, payment_id, date) VALUES (?, ?, ?, NULL, NOW())`,
      [session_id, client_id, seat]
    );

    res.json({ message: 'Билет забронирован!', ticket_id: insertTicket.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка при бронировании' });
  }
});

app.post('/api/payments', async (req, res) => {
  const { ticket_id } = req.body;
  if (!ticket_id) return res.status(400).json({ message: 'ticket_id обязателен' });

  try {
    const [tickets] = await pool.query(
      `SELECT session_id, payment_id FROM ticket WHERE ticket_id = ?`, [ticket_id]
    );
    if (tickets.length === 0) return res.status(404).json({ message: 'Билет не найден' });

    const ticket = tickets[0];
    if (ticket.payment_id) return res.status(400).json({ message: 'Билет уже оплачен' });

    const [sessions] = await pool.query(
      `SELECT price FROM session WHERE session_id = ?`, [ticket.session_id]
    );
    if (sessions.length === 0) return res.status(404).json({ message: 'Сеанс не найден' });

    const amount = sessions[0].price;
    const [insertPayment] = await pool.query(
      `INSERT INTO payment (date, status, amount) VALUES (NOW(), 'paid', ?)`, [amount]
    );
    
    const payment_id = insertPayment.insertId;
    await pool.query(
      `UPDATE ticket SET payment_id = ?, status = 'paid' WHERE ticket_id = ?`,
      [payment_id, ticket_id]
    );

    res.json({ message: 'Оплата прошла успешно', payment_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка при оплате' });
  }
});

app.get('/api/client/info', async (req, res) => {
  const { name, phone, email } = req.query;
  if (!name || !phone || !email) return res.status(400).json({ message: 'Не все параметры переданы' });

  try {
    const [clientRows] = await pool.query(
      `SELECT client_id, name, phone, email FROM client WHERE name = ? AND phone = ? AND email = ? LIMIT 1`,
      [name, phone, email]
    );
    if (clientRows.length === 0) return res.status(404).json({ message: 'Клиент не найден' });

    const client = clientRows[0];
    const [tickets] = await pool.query(`
      SELECT 
        ticket.ticket_id, ticket.seat, ticket.status, 
        session.date, session.s_time, 
        film.name AS film_name, 
        hall.hall_id AS hall_number
      FROM ticket
      JOIN session ON ticket.session_id = session.session_id
      JOIN film ON session.film_id = film.film_id
      JOIN hall ON session.hall_id = hall.hall_id
      WHERE ticket.client_id = ?`, [client.client_id]
    );

    res.json({ client, tickets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.post('/api/refund_ticket/:ticketId', async (req, res) => {
  const ticketId = req.params.ticketId;
  try {
    const [[ticket]] = await pool.query(
      `SELECT payment_id, status FROM ticket WHERE ticket_id = ?`, [ticketId]
    );
    if (!ticket) return res.status(404).json({ message: 'Билет не найден' });
    if (ticket.status !== 'paid') return res.status(400).json({ message: 'Только оплаченные билеты можно вернуть' });

    await pool.query(`UPDATE ticket SET status = 'refunded' WHERE ticket_id = ?`, [ticketId]);
    if (ticket.payment_id) {
      await pool.query(`UPDATE payment SET status = 'refunded' WHERE payment_id = ?`, [ticket.payment_id]);
    }
    res.json({ message: 'Билет успешно возвращён' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка при возврате' });
  }
});

// Маршруты для администраторов

app.get('/api/admin/films', async (req, res) => {
  try {
    const [films] = await pool.query(`
      SELECT film.film_id, film.name, film.year, film.description, film.duration,
        director.name AS director,
        GROUP_CONCAT(genre.name SEPARATOR ', ') AS genres
      FROM film
      JOIN director ON film.director_id = director.director_id
      LEFT JOIN film_genre ON film.film_id = film_genre.film_id
      LEFT JOIN genre ON film_genre.genre_id = genre.genre_id
      GROUP BY film.film_id
    `);
    res.json(films);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка получения фильмов' });
  }
});

app.post('/api/admin/films', async (req, res) => {
  const { name, year, description, director_id, genres, duration } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO film (name, year, description, director_id, duration) VALUES (?, ?, ?, ?, ?)`,
      [name, year, description, director_id, duration]
    );
    const film_id = result.insertId;
    if (Array.isArray(genres) && genres.length > 0) {
      const values = genres.map(genre_id => [film_id, genre_id]);
      await pool.query(`INSERT INTO film_genre (film_id, genre_id) VALUES ?`, [values]);
    }
    res.json({ film_id });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка добавления фильма');
  }
});

app.delete('/api/films/:film_id', async (req, res) => {
  const film_id = req.params.film_id;
  try {
    await pool.query('DELETE FROM film_genre WHERE film_id = ?', [film_id]);
    const [result] = await pool.query('DELETE FROM film WHERE film_id = ?', [film_id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Фильм не найден' });
    res.json({ message: 'Фильм удалён' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка при удалении фильма' });
  }
});

app.get('/api/admin/directors', async (req, res) => {
  try {
    const [directors] = await pool.query('SELECT director_id, name FROM director ORDER BY name');
    res.json(directors);
  } catch (err) { res.status(500).json({ message: 'Ошибка сервера' }); }
});

app.post('/api/admin/directors', async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') return res.status(400).json({ message: 'Некорректное имя' });
  try {
    const [existing] = await pool.query('SELECT director_id FROM director WHERE name = ?', [name.trim()]);
    if (existing.length > 0) return res.status(409).json({ message: 'Режиссёр уже существует' });
    const [result] = await pool.query('INSERT INTO director (name) VALUES (?)', [name.trim()]);
    res.status(201).json({ director_id: result.insertId });
  } catch (err) { res.status(500).json({ message: 'Ошибка добавления' }); }
});

app.get('/api/admin/genres', async (req, res) => {
  try {
    const [genres] = await pool.query('SELECT genre_id, name FROM genre ORDER BY name');
    res.json(genres);
  } catch (err) { res.status(500).json({ message: 'Ошибка загрузки жанров' }); }
});

app.get('/api/admin/sessions', async (req, res) => {
  try {
    const [sessions] = await pool.query(`
      SELECT s.session_id, s.film_id, f.name AS film_name, s.hall_id, h.hall_id AS hall_number,
        ht.name AS hall_type_name, s.date, s.s_time, s.end_time, s.status, s.price,
        c.name AS cashier_name,
        COUNT(CASE WHEN t.status IN ('paid', 'used') THEN 1 END) AS sold_tickets_count
      FROM session s
      JOIN film f ON s.film_id = f.film_id
      JOIN hall h ON s.hall_id = h.hall_id
      JOIN hall_type ht ON h.hall_type_id = ht.hall_type_id
      LEFT JOIN cashier c ON s.cashier_id = c.cashier_id
      LEFT JOIN ticket t ON s.session_id = t.session_id
      GROUP BY s.session_id
      ORDER BY s.date, s.s_time ASC;
    `);
    res.json(sessions);
  } catch (err) {
    console.error('Ошибка SQL:', err.message);
    res.status(500).json({ message: 'Ошибка при загрузке сеансов' });
  }
});

app.post('/api/admin/sessions', async (req, res) => {
  const { film_id, hall_id, date, s_time, end_time, cashier_id, price } = req.body;
  if (!film_id || !hall_id || !date || !s_time || !end_time || !price) {
    return res.status(400).json({ error: 'Обязательные поля не заполнены' });
  }
  try {
    await pool.query(`
      INSERT INTO session (film_id, hall_id, date, s_time, end_time, status, cashier_id, price)
      VALUES (?, ?, ?, ?, ?, 'planned', ?, ?)
    `, [film_id, hall_id, date, s_time, end_time, cashier_id || null, price]);
    res.status(201).json({ message: 'Сеанс добавлен' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка добавления сеанса' });
  }
});

app.post('/api/admin/sessions/:sessionId/cancel', async (req, res) => {
  const { sessionId } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`UPDATE session SET status = 'canceled' WHERE session_id = ?`, [sessionId]);
    await connection.query(`UPDATE ticket SET status = 'refunded' WHERE session_id = ?`, [sessionId]);
    await connection.query(`
      UPDATE payment SET status = 'refunded' 
      WHERE payment_id IN (
        SELECT DISTINCT t.payment_id FROM ticket t
        WHERE t.session_id = ? AND t.payment_id IS NOT NULL
      )
    `, [sessionId]);
    await connection.commit();
    res.json({ message: 'Сеанс отменён' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Ошибка при отмене сеанса' });
  } finally {
    connection.release();
  }
});

app.get('/api/admin/clients', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT client_id, name, phone, email FROM client ORDER BY name');
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Ошибка сервера' }); }
});

app.delete('/api/admin/clients/:id', async (req, res) => {
  const clientId = req.params.id;
  try {
    const [result] = await pool.query('DELETE FROM client WHERE client_id = ?', [clientId]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Клиент не найден' });
    res.json({ message: 'Клиент удалён' });
  } catch (err) { res.status(500).json({ message: 'Ошибка удаления' }); }
});

app.get('/api/admin/clients/:client_id/tickets', async (req, res) => {
  const clientId = req.params.client_id;
  try {
    const [tickets] = await pool.execute(`
      SELECT t.ticket_id, f.name AS film_name, s.date AS session_date, t.status, t.date
      FROM ticket t
      JOIN session s ON t.session_id = s.session_id
      JOIN film f ON s.film_id = f.film_id
      WHERE t.client_id = ?
      ORDER BY t.date DESC
    `, [clientId]);
    res.json(tickets);
  } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.get('/api/admin/cashiers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT cashier_id, name, phone FROM cashier');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Ошибка получения кассиров' }); }
});

app.delete('/api/admin/cashiers/:id', async (req, res) => {
  const cashierId = req.params.id;
  try {
    const [result] = await pool.query('DELETE FROM cashier WHERE cashier_id = ?', [cashierId]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Кассир не найден' });
    res.json({ message: 'Кассир удалён' });
  } catch (err) { res.status(500).json({ message: 'Ошибка удаления' }); }
});

// Вспомогательные маршруты
app.get('/api/halls', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT h.hall_id, ht.name as hall_type_name
      FROM hall h LEFT JOIN hall_type ht ON h.hall_type_id = ht.hall_type_id
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Ошибка получения залов' }); }
});

app.get('/api/cashiers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT cashier_id, name FROM cashier');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Ошибка получения кассиров' }); }
});

app.get('/api/admin/sessions/free', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.session_id, f.name AS film_name, s.date, s.s_time
      FROM session s JOIN film f ON s.film_id = f.film_id
      WHERE s.cashier_id IS NULL AND s.status = 'planned'
      ORDER BY s.date, s.s_time
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Ошибка загрузки' }); }
});

// Отдача HTML страниц
app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(clientPath, 'admin.html'));
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
  console.log(`Админка доступна на http://localhost:${PORT}/admin`);
});
