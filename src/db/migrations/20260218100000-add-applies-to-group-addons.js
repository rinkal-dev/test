'use strict';

/**
 * Migration: Add applies_to column to group_addons table
 *
 * This field determines which guest types are counted for per-guest pricing:
 * - all_guests: Count adults + children (DEFAULT)
 * - adults_only: Only count adults (e.g., spa packages, alcohol)
 * - children_only: Only count children (e.g., kids activities)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('group_addons', 'applies_to', {
      type: Sequelize.ENUM('all_guests', 'adults_only', 'children_only'),
      allowNull: false,
      defaultValue: 'all_guests',
      after: 'pricing_type',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('group_addons', 'applies_to');
    // Clean up the ENUM type
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_group_addons_applies_to";'
    );
  },
};
