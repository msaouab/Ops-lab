-- q14_days_between_orders  ·  Hard
--
-- For customers with at least two CONFIRMED orders: the average number of days between
-- consecutive confirmed orders.
-- Columns: customer, avg_days (rounded to 1 decimal)
-- Order: customer ASC.
-- Hint: LAG(date_order) OVER (PARTITION BY partner_id ORDER BY date_order).
--
-- Tables: see schema.sql. Write your query below this line.

