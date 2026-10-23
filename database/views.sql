USE `кинотеатр`;

DROP VIEW IF EXISTS planned_sessions_cashiers;
DROP VIEW IF EXISTS ticket_info;

-- Представление: сеансы и назначенные на них кассиры
CREATE VIEW planned_sessions_cashiers AS
SELECT 
    ca.name AS cashier_name,
    ca.phone AS cashier_phone,
    s.session_id,
    s.date AS session_date,
    s.s_time AS session_start_time
FROM session s
JOIN cashier ca ON s.cashier_id = ca.cashier_id
WHERE s.status = 'planned';

-- Представление: полная информация по билету
CREATE VIEW ticket_info AS
SELECT 
    c.name AS client,
    f.name AS film,
    CONCAT(s.date, ' ', s.s_time) AS session_time,
    h.hall_id AS hall,
    ht.name AS hall_type,
    t.seat AS seat,
    s.price AS price,
    t.status AS ticket_status
FROM ticket t
JOIN client c ON t.client_id = c.client_id
JOIN session s ON t.session_id = s.session_id
JOIN film f ON s.film_id = f.film_id
JOIN hall h ON s.hall_id = h.hall_id
JOIN hall_type ht ON h.hall_type_id = ht.hall_type_id;
