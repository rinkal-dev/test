'use strict';

/**
 * Migration: Add timezone field to hotels table
 *
 * This allows each hotel to have its own timezone for display purposes.
 * All timestamps stored in UTC, converted to hotel timezone for display.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('hotels', 'timezone', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'UTC',
      comment: 'IANA timezone for the hotel (e.g., America/Cancun, Europe/Paris)',
    });

    console.log('✅ Timezone field added to hotels table');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('hotels', 'timezone');
    console.log('✅ Timezone field removed from hotels table');
  },
};
