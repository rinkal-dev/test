'use strict';

/**
 * Migration: Add roommate opt-in fields to bookings table
 *
 * Solo Traveler Connection feature - allows guests to opt-in
 * to be connected with other solo travelers in the same group.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add roommate_opt_in boolean field
    await queryInterface.addColumn('bookings', 'roommate_opt_in', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Guest opted in to solo traveler connection',
    });

    // Add roommate_note text field for preferences/notes
    await queryInterface.addColumn('bookings', 'roommate_note', {
      type: Sequelize.STRING(500),
      allowNull: true,
      defaultValue: null,
      comment: 'Optional note for roommate matching preferences',
    });

    // Add index for efficient querying of opted-in guests per group
    await queryInterface.addIndex('bookings', ['wedding_group_id', 'roommate_opt_in'], {
      name: 'idx_bookings_group_roommate_opt_in',
      where: {
        roommate_opt_in: true,
        status: ['pending', 'deposit_paid', 'confirmed'],
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('bookings', 'idx_bookings_group_roommate_opt_in');
    await queryInterface.removeColumn('bookings', 'roommate_note');
    await queryInterface.removeColumn('bookings', 'roommate_opt_in');
  },
};
