'use strict';

/**
 * Migration: Add timezone fields for industry-standard timezone handling
 *
 * TIMEZONE STRATEGY:
 * 1. wedding_groups.timezone - Event/Hotel timezone (e.g., 'America/Cancun')
 *    - All event times displayed in this timezone
 *    - Check-in/check-out times are in hotel's local time
 *
 * 2. bookings.guest_timezone - Guest's timezone when booking (e.g., 'Asia/Kolkata')
 *    - Captured from browser for analytics/context
 *    - Helps admin understand when guest actually booked
 *
 * All timestamps stored in UTC, converted to event timezone for display.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add timezone to wedding_groups (event/hotel timezone)
    await queryInterface.addColumn('wedding_groups', 'timezone', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'UTC',
      comment: 'IANA timezone for the event/hotel (e.g., America/Cancun, Europe/Paris)',
    });

    // Add guest_timezone to bookings (where guest made the booking from)
    await queryInterface.addColumn('bookings', 'guest_timezone', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: null,
      comment: 'IANA timezone where guest made the booking (e.g., Asia/Kolkata)',
    });

    console.log('✅ Timezone fields added successfully');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('wedding_groups', 'timezone');
    await queryInterface.removeColumn('bookings', 'guest_timezone');
    console.log('✅ Timezone fields removed');
  },
};
