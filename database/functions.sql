USE `кинотеатр`;
DELIMITER //

-- Подсчет количества проданных билетов на сеанс
CREATE FUNCTION count_sold_tickets(p_session_id INT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_sold_tickets INT;
    SELECT COUNT(*) INTO v_sold_tickets
    FROM ticket
    WHERE session_id = p_session_id
      AND status IN ('paid', 'used');
    RETURN v_sold_tickets;
END //

-- Подсчет суммы платежа клиента на конкретный сеанс
CREATE FUNCTION get_total_payment(p_client_id INT, p_session_id INT)
RETURNS DECIMAL(7,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total_payment DECIMAL(7,2) DEFAULT 0;
    SELECT SUM(s.price) INTO v_total_payment
    FROM ticket t
    JOIN session s ON t.session_id = s.session_id
    WHERE t.client_id = p_client_id
      AND t.session_id = p_session_id
      AND t.status NOT IN ('used')
    GROUP BY t.date, t.status;
    
    IF v_total_payment > 0 THEN
        RETURN v_total_payment;
    ELSE
        RETURN 0;
    END IF;
END //

DELIMITER ;
