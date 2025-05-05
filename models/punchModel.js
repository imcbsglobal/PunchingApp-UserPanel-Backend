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
        customerName, // Now required
        username,
        status || "PENDING",
      ]
    );
    return rows[0];
  },

  /** 3) Get punch by ID */
  async findPunchById(id) {
    const { rows } = await pool.query(
      "SELECT * FROM punch_records WHERE id = $1",
      [id]
    );
    return rows[0];
  },

  /** 4) Update punch-out and calculate total time */
  async updatePunchOut({
    id,
    punchOutTime,
    punchOutLocation,
    punchOutDate, // Added punchOutDate parameter
    totalTimeSpent,
    status,
    photoFilename,
  }) {
    // Create a base query with punch_out_date field
    let query = `
      UPDATE punch_records
      SET punch_out_time = $1,
          punch_out_location = $2,
          punch_out_date = $3,
          total_time_spent = make_interval(secs => $4),
          status = $5,
          updated_at = NOW()
    `;

    // Start with the base parameters
    const params = [
      punchOutTime,
      punchOutLocation,
      punchOutDate, // Store the punch out date separately
      totalTimeSpent,
      status || "COMPLETED",
    ];
    let paramCount = 5;

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

  /** 6) Get pending punches for a specific user */
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

  /** 7) Get completed punches for a specific user */
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

  /** 8) Find punches by specific date for admin dashboard */
  async findPunchesByDate(date, clientId) {
    const { rows } = await pool.query(
      `SELECT p.*, u.name as user_name
         FROM punch_records p
         LEFT JOIN users u ON p.username = u.id
        WHERE p.punch_date = $1 AND p.client_id = $2
        ORDER BY p.punch_in_time DESC`,
      [date, clientId]
    );
    return rows;
  },

  /** 9) Find recent punches (last X days) for admin dashboard */
  async findRecentPunches(days, clientId) {
    const { rows } = await pool.query(
      `SELECT p.*, u.name as user_name
         FROM punch_records p
         LEFT JOIN users u ON p.username = u.id
        WHERE p.punch_date >= CURRENT_DATE - INTERVAL '$1 days'
          AND p.client_id = $2
        ORDER BY p.punch_date DESC, p.punch_in_time DESC`,
      [days, clientId]
    );
    return rows;
  },
};
