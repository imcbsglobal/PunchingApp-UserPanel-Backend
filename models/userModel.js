//models/userModel.js
const pool = require("../config/db");
module.exports = {
  async findById(id) {
    const { rows } = await pool.query(
      "SELECT id, pass AS password, client_id FROM acc_users WHERE id = $1",
      [id]
    );
    return rows[0];
  },
};
