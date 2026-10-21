-- A tiny ERP database shaped like a real ERP's tables (res_partner, sale_order, ...).
-- Loaded fresh into the "prep" schema before every test run. Do not edit.
DROP SCHEMA IF EXISTS prep CASCADE;
CREATE SCHEMA prep;
SET search_path TO prep;

CREATE TABLE res_country (
    id   serial PRIMARY KEY,
    code char(2) NOT NULL UNIQUE,
    name text NOT NULL
);

CREATE TABLE res_partner (
    id          serial PRIMARY KEY,
    name        text NOT NULL,
    email       text,
    country_id  int REFERENCES res_country(id),
    is_company  boolean NOT NULL DEFAULT false,
    parent_id   int REFERENCES res_partner(id),   -- contact person -> its company
    create_date date NOT NULL
);

CREATE TABLE hr_employee (
    id         serial PRIMARY KEY,
    name       text NOT NULL,
    department text NOT NULL,
    job_title  text NOT NULL,
    manager_id int REFERENCES hr_employee(id),
    hire_date  date NOT NULL,
    salary     numeric(10, 2) NOT NULL
);

CREATE TABLE product_category (
    id   serial PRIMARY KEY,
    name text NOT NULL
);

CREATE TABLE product_product (
    id             serial PRIMARY KEY,
    name           text NOT NULL,
    categ_id       int NOT NULL REFERENCES product_category(id),
    list_price     numeric(10, 2) NOT NULL,   -- sales price
    standard_price numeric(10, 2) NOT NULL,   -- cost
    active         boolean NOT NULL DEFAULT true
);

CREATE TABLE sale_order (
    id         serial PRIMARY KEY,
    name       text NOT NULL UNIQUE,          -- S00001
    partner_id int NOT NULL REFERENCES res_partner(id),
    user_id    int REFERENCES hr_employee(id), -- salesperson
    date_order date NOT NULL,
    state      text NOT NULL CHECK (state IN ('draft', 'sent', 'sale', 'cancel'))
);

CREATE TABLE sale_order_line (
    id         serial PRIMARY KEY,
    order_id   int NOT NULL REFERENCES sale_order(id) ON DELETE CASCADE,
    product_id int NOT NULL REFERENCES product_product(id),
    qty        numeric(10, 2) NOT NULL CHECK (qty > 0),
    price_unit numeric(10, 2) NOT NULL,
    discount   numeric(5, 2) NOT NULL DEFAULT 0   -- percent, 10 = 10%
);
-- line subtotal = qty * price_unit * (1 - discount / 100)

CREATE TABLE stock_move (
    id         serial PRIMARY KEY,
    product_id int NOT NULL REFERENCES product_product(id),
    date       date NOT NULL,
    qty        numeric(10, 2) NOT NULL,      -- positive = received, negative = delivered
    unit_cost  numeric(10, 2) NOT NULL
);
