'use strict';

/**
 * Migration: Add tax fields to bookings table
 *
 * This migration adds tax_rate and tax_amount fields to store
 * the tax calculation at the time of booking.
 *
 * The total_amount will now include taxes (industry standard).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add tax_rate field (captures the rate at time of booking)
    await queryInterface.addColumn('bookings', 'tax_rate', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Tax rate percentage applied at booking time',
    });

    // Add tax_amount field (calculated tax amount)
    await queryInterface.addColumn('bookings', 'tax_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Calculated tax amount',
    });

    // Add subtotal field (pre-tax amount for clarity)
    await queryInterface.addColumn('bookings', 'subtotal', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Subtotal before taxes (rooms + addons)',
    });

    console.log('Added tax_rate, tax_amount, and subtotal columns to bookings table');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('bookings', 'tax_rate');
    await queryInterface.removeColumn('bookings', 'tax_amount');
    await queryInterface.removeColumn('bookings', 'subtotal');
    console.log('Removed tax_rate, tax_amount, and subtotal columns from bookings table');
  },
};
