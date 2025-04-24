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

  /** 2) Create a punch-in record with username and status */
  async createPunchIn({
    punchDate,
    punchInTime,
    punchInLocation,
    photoFilename,
    clientId,
    customerName,
    username,
    status,
  }) {
    const { rows } = await pool.query(
      `INSERT INTO punch_records
        (punch_date, 
         punch_in_time, 
         punch_in_location, 
         photo_filename,
         client_id, 
         customer_name, 
         username, 
         status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        punchDate,
        punchInTime,
        punchInLocation,
        photoFilename,
        clientId,
        customerName,
        username,
        status || "PENDING",
      ]
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

  /** 4) Update punch-out and calculate total time, now with status update */
  async updatePunchOut({
    id,
    punchOutTime,
    punchOutLocation,
    totalTimeSpent,
    status,
    customerName,
    photoFilename,
  }) {
    // Create a base query
    let query = `
      UPDATE punch_records
      SET punch_out_time = $1,
          punch_out_location = $2,
          total_time_spent = make_interval(secs => $3),
          status = $4,
          updated_at = NOW()
    `;

    // Start with the base parameters
    const params = [
      punchOutTime,
      punchOutLocation,
      totalTimeSpent,
      status || "COMPLETED",
    ];
    let paramCount = 4;

    // Conditionally add customerName if provided
    if (customerName) {
      query += `, customer_name = $${++paramCount}`;
      params.push(customerName);
    }

    // Conditionally add photoFilename if provided
    if (photoFilename) {
      query += `, photo_filename = $${++paramCount}`;
      params.push(photoFilename);
    }

    // Add WHERE clause and RETURNING
    query += ` WHERE id = $${++paramCount} RETURNING *`;
    params.push(id);

    const { rows } = await pool.query(query, params);
    return rows[0];
  },

  /** 5) Get all punches by client ID */
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

  /** 6) New function: Get pending punches for a specific user */
  async findPendingPunchesByUser(username) {
    const { rows } = await pool.query(
      `SELECT * 
         FROM punch_records
        WHERE username = $1 AND (status = 'PENDING' OR status IS NULL)
        ORDER BY punch_date DESC, punch_in_time DESC`,
      [username]
    );
    return rows;
  },

  /** 7) Bonus function: Get completed punches for a specific user */
  async findCompletedPunchesByUser(username, limit = 10) {
    const { rows } = await pool.query(
      `SELECT * 
         FROM punch_records
        WHERE username = $1 AND status = 'COMPLETED'
        ORDER BY punch_date DESC, punch_in_time DESC
        LIMIT $2`,
      [username, limit]
    );
    return rows;
  },
};
