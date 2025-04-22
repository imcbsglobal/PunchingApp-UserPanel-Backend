// models/punchModel.js
const pool = require("../config/db");

module.exports = {
  /** 1) Fetch only customer names for dropdown */
  async findCustomers(clientId) {
    const { rows } = await pool.query(
      "SELECT name FROM acc_master WHERE client_id = $1",
      [clientId]
    );
    return rows; // [{ name: 'Customer A' }, …]
  },

  /** 2) Create a punch-in record */
  async createPunchIn({
    punchDate,
    punchInTime,
    punchInLocation,
    photo,
    clientId,
    customerName,
  }) {
    const { rows } = await pool.query(
      `INSERT INTO punch_records
        (punch_date,
         punch_in_time,
         punch_in_location,
         photo,
         client_id,
         customer_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [punchDate, punchInTime, punchInLocation, photo, clientId, customerName]
    );
    return rows[0];
  },

  /** 3) Get punch by ID (optional: client-scope it if needed) */
  async findPunchById(id) {
    const { rows } = await pool.query(
      "SELECT * FROM punch_records WHERE id = $1",
      [id]
    );
    return rows[0];
  },

  /** 4) Update punch-out and calculate total time */
  async updatePunchOut({ id, punchOutTime, punchOutLocation, totalTimeSpent }) {
    const { rows } = await pool.query(
      `UPDATE punch_records
         SET punch_out_time     = $1,
             punch_out_location = $2,
             total_time_spent   = make_interval(secs => $3),
             updated_at         = NOW()
       WHERE id = $4
       RETURNING *`,
      [punchOutTime, punchOutLocation, totalTimeSpent, id]
    );
    return rows[0];
  },
  /** 5) Optional: Get all punches by client ID */
  async getPunchesByClient(clientId) {
    const { rows } = await pool.query(
      `SELECT *
         FROM punch_records
        WHERE client_id = $1
        ORDER BY punch_date DESC, punch_in_time DESC`,
      [clientId]
    );
    return rows;
  },
};
