'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Make booking_id nullable to support creating payment before booking
    await queryInterface.changeColumn('payments', 'booking_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert to NOT NULL (only works if all payments have booking_id)
    await queryInterface.changeColumn('payments', 'booking_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
    });
  },
};
