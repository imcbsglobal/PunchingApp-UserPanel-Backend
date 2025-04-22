//config/db.js
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
module.exports = pool;
// This code creates a connection pool to a PostgreSQL database using the pg library.
