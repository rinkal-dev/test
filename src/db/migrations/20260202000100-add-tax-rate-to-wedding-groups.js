'use strict';

/**
 * Migration: Add tax_rate field to wedding_groups table
 *
 * This allows each wedding group to have its own configurable tax rate
 * instead of using a hardcoded 15% across all bookings.
 *
 * Default: 15.00 (15%)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('wedding_groups', 'tax_rate', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 15.00,
      comment: 'Tax rate percentage (e.g., 15.00 = 15%)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('wedding_groups', 'tax_rate');
  }
};
