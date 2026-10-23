USE `кинотеатр`;
DELIMITER //

DROP PROCEDURE IF EXISTS refund_ticket;

-- Процедура возврата билета
CREATE PROCEDURE refund_ticket(IN p_ticket_id INT)
BEGIN
    DECLARE v_session_date DATE;
    DECLARE v_session_s_time TIME;
    DECLARE v_status VARCHAR(20);
    DECLARE v_price DECIMAL(5, 2);
    DECLARE v_result_msg VARCHAR(50);

    -- Получение данные о билете и сеансе
    SELECT t.status, s.date, s.s_time, s.price
    INTO v_status, v_session_date, v_session_s_time, v_price
    FROM ticket t
    JOIN session s ON t.session_id = s.session_id
    WHERE t.ticket_id = p_ticket_id;

    -- Проверка: билет оплачен и до сеанса > 10 минут
    IF v_status = 'paid' AND TIMESTAMP(v_session_date, v_session_s_time) >= NOW() + INTERVAL 10 MINUTE THEN
        -- Меняем статус билета
        UPDATE ticket SET status = 'refunded' WHERE ticket_id = p_ticket_id;
        
        -- Создание записи о возврате платежа
        INSERT INTO payment (amount, date, status) VALUES (v_price, NOW(), 'refunded');
        
        -- Привязка возврата к билету
        UPDATE ticket SET payment_id = LAST_INSERT_ID() WHERE ticket_id = p_ticket_id;

        SET v_result_msg = 'Возврат оформлен';
    ELSE
        SET v_result_msg = 'Билет вернуть нельзя';
    END IF;

    SELECT v_result_msg AS message;
END //

DELIMITER ;
