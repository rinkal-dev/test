'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'failed' to the booking status enum
    // PostgreSQL requires ALTER TYPE to add new enum values
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_bookings_status" ADD VALUE IF NOT EXISTS 'failed';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing enum values easily
    // This would require recreating the enum and updating all references
    console.log('Removing enum values is not supported in PostgreSQL without recreating the type');
  },
};
