CREATE TABLE hr_department (id INTEGER PRIMARY KEY, name TEXT NOT NULL, budget INTEGER);
CREATE TABLE hr_employee (id INTEGER PRIMARY KEY, name TEXT NOT NULL, job_title TEXT, department_id INTEGER REFERENCES hr_department(id), manager_id INTEGER REFERENCES hr_employee(id), salary INTEGER, hire_date TEXT, email TEXT);
CREATE TABLE res_partner (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT, country TEXT, is_company INTEGER, email TEXT);
CREATE TABLE product_product (id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT, list_price REAL, cost REAL);
CREATE TABLE sale_order (id INTEGER PRIMARY KEY, name TEXT NOT NULL, partner_id INTEGER REFERENCES res_partner(id), salesperson_id INTEGER REFERENCES hr_employee(id), date_order TEXT, state TEXT);
CREATE TABLE sale_order_line (id INTEGER PRIMARY KEY, order_id INTEGER REFERENCES sale_order(id), product_id INTEGER REFERENCES product_product(id), qty INTEGER, price_unit REAL, discount INTEGER DEFAULT 0);
INSERT INTO hr_department VALUES
 (1,'Management',200000),(2,'Sales',150000),(3,'R&D',300000),(4,'Support',80000),(5,'Legal',50000);
INSERT INTO hr_employee VALUES
 (1,'Fatima Zahra Bennani','CEO',1,NULL,15000,'2015-03-01','fz.bennani@erp-demo.ma'),
 (2,'Sara Alami','Sales Manager',2,1,9000,'2016-06-15','sara.alami@erp-demo.ma'),
 (3,'Omar Tazi','Salesperson',2,2,5200,'2019-01-10','omar.tazi@erp-demo.ma'),
 (4,'Karim El Idrissi','CTO',3,1,12000,'2016-02-01','karim.idrissi@erp-demo.ma'),
 (5,'Lina Chraibi','Developer',3,4,6500,'2020-09-01','lina.chraibi@erp-demo.ma'),
 (6,'Youssef Amrani','Developer',3,4,6100,'2021-04-12',NULL),
 (7,'Nadia Berrada','Support Lead',4,1,5800,'2018-11-20','nadia.berrada@erp-demo.ma'),
 (8,'Hamza Ouali','Support Agent',4,7,3900,'2022-02-14','hamza.ouali@erp-demo.ma'),
 (9,'Salma Fassi','Salesperson',2,2,5600,'2020-03-03','salma.fassi@erp-demo.ma'),
 (10,'Mehdi Kabbaj','Developer',3,5,5400,'2023-07-01','mehdi.kabbaj@erp-demo.ma'),
 (11,'Imane Lahlou','Functional Consultant',3,4,7000,'2019-10-07','imane.lahlou@erp-demo.ma'),
 (12,'Rachid Naciri','Salesperson',2,9,4800,'2024-01-15',NULL),
 (13,'Aya Mansouri','Intern',NULL,4,1500,'2026-06-01','aya.mansouri@erp-demo.ma'),
 (14,'Anas Belhaj','Support Agent',4,7,3900,'2023-05-22','anas.belhaj@erp-demo.ma');
INSERT INTO res_partner VALUES
 (1,'Atlas Logistics','Casablanca','Morocco',1,'contact@atlaslog.ma'),
 (2,'Riad Design Studio','Marrakech','Morocco',1,'hello@riaddesign.ma'),
 (3,'Brussels Bikes','Brussels','Belgium',1,'info@brusselsbikes.be'),
 (4,'Hassan Ait Ali','Rabat','Morocco',0,'hassan.aitali@gmail.com'),
 (5,'Café Lumière','Paris','France',1,NULL),
 (6,'Nora Lefevre','Louvain-la-Neuve','Belgium',0,'nora.lefevre@gmail.com'),
 (7,'Sahara Solar','Ouarzazate','Morocco',1,'sales@saharasolar.ma'),
 (8,'Tanger Med Trading','Tangier','Morocco',1,'trade@tmt.ma'),
 (9,'Julien Dubois','Paris','France',0,'j.dubois@outlook.fr'),
 (10,'Fes Crafts Coop','Fes','Morocco',1,'coop@fescrafts.ma');
INSERT INTO product_product VALUES
 (1,'Office Chair','Furniture',249,140),(2,'Standing Desk','Furniture',599,360),(3,'Desk Lamp','Office',39,15),
 (4,'Monitor 27 inch','Electronics',329,250),(5,'Wireless Keyboard','Electronics',79,35),(6,'Notebook Pack','Office',12,4),
 (7,'Filing Cabinet','Furniture',189,110),(8,'Webcam HD','Electronics',99,45),(9,'Whiteboard','Office',149,70),
 (10,'Ergo Footrest','Furniture',59,22);
INSERT INTO sale_order VALUES
 (1,'S00001',1,3,'2026-01-08','done'),(2,'S00002',2,9,'2026-01-15','done'),(3,'S00003',4,3,'2026-02-02','sale'),
 (4,'S00004',3,9,'2026-02-10','cancel'),(5,'S00005',1,3,'2026-02-21','sale'),(6,'S00006',5,12,'2026-03-05','draft'),
 (7,'S00007',7,9,'2026-03-18','done'),(8,'S00008',8,3,'2026-04-01','sale'),(9,'S00009',6,12,'2026-04-09','sale'),
 (10,'S00010',2,9,'2026-05-12','done'),(11,'S00011',9,3,'2026-05-30','cancel'),(12,'S00012',7,9,'2026-06-14','sale');
INSERT INTO sale_order_line VALUES
 (1,1,1,10,249,10),(2,1,3,10,39,0),(3,2,2,2,599,0),(4,2,9,1,149,0),(5,3,5,1,79,0),(6,3,8,1,99,0),
 (7,4,4,3,329,5),(8,5,7,4,189,0),(9,5,6,20,12,0),(10,6,1,2,249,0),(11,7,4,6,329,10),(12,7,5,6,79,10),
 (13,7,8,6,99,10),(14,8,2,1,599,0),(15,8,3,2,39,0),(16,9,6,5,12,0),(17,10,1,5,249,5),(18,10,7,2,189,0),
 (19,11,9,1,149,0),(20,12,4,2,329,0),(21,12,3,4,39,0);
