'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'approved' and 'denied' to the refunds status enum
    // PostgreSQL allows adding values to an existing enum type
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_refunds_status" ADD VALUE IF NOT EXISTS 'approved';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_refunds_status" ADD VALUE IF NOT EXISTS 'denied';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing values from an enum easily
    // To properly rollback, you would need to:
    // 1. Create a new enum type without the values
    // 2. Update the column to use the new type
    // 3. Drop the old enum type
    // For safety, we'll leave this as a no-op
    console.log('Rollback not supported for enum value removal - manual intervention required');
  },
};
