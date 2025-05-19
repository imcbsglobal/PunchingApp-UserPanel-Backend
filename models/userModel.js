// models/userModel.js
const pool = require("../config/db");

module.exports = {
  /**
   * Fetch a user by id AND client_id.
   * @param {string} id
   * @param {string|number} client_id
   * @returns {Promise<object|undefined>}
   */
  async findById(id, client_id) {
    const { rows } = await pool.query(
      `SELECT
         id,
         pass       AS password,
         client_id
       FROM acc_users
       WHERE id        = $1
         AND client_id = $2
       LIMIT 1`,
      [id, client_id]
    );
    return rows[0];
  },
};
