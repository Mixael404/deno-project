import { Database } from "jsr:@db/sqlite";
const db = new Database("app.db");
db.exec("UPDATE users SET role = 'ADMIN' WHERE id = 2");
console.log(db.prepare("SELECT id, email, role FROM users WHERE id = 2").get(2));
