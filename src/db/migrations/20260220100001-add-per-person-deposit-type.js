'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'per_person' to deposit_type enum (PostgreSQL syntax)
    await queryInterface.sequelize.query(`
      ALTER TYPE enum_wedding_groups_deposit_type ADD VALUE IF NOT EXISTS 'per_person';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing enum values directly
    // First update any records using 'per_person' to 'fixed'
    await queryInterface.sequelize.query(`
      UPDATE wedding_groups
      SET deposit_type = 'fixed'
      WHERE deposit_type = 'per_person'
    `);
    // The enum value will remain but be unused
    // Full removal would require recreating the enum type
  },
};
