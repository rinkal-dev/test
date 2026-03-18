'use strict';

/**
 * Migration: Add applies_to column to booking_addons table
 *
 * Stores the applies_to setting at time of booking (immutable record).
 * Used for price recalculation and historical accuracy.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('booking_addons', 'applies_to', {
      type: Sequelize.ENUM('all_guests', 'adults_only', 'children_only'),
      allowNull: false,
      defaultValue: 'all_guests',
      after: 'pricing_type',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('booking_addons', 'applies_to');
    // Clean up the ENUM type
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_booking_addons_applies_to";'
    );
  },
};
