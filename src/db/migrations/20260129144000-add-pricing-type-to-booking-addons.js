'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create the pricing_type enum for booking_addons (reuse the same enum type name if possible)
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_booking_addons_pricing_type') THEN
          CREATE TYPE "enum_booking_addons_pricing_type" AS ENUM (
            'per_stay',
            'per_night',
            'per_guest',
            'per_guest_per_night'
          );
        END IF;
      END$$;
    `);

    // Add the pricing_type column
    await queryInterface.addColumn('booking_addons', 'pricing_type', {
      type: Sequelize.ENUM('per_stay', 'per_night', 'per_guest', 'per_guest_per_night'),
      allowNull: false,
      defaultValue: 'per_stay',
      comment: 'How the addon price was calculated',
    });

    // Migrate existing data: is_per_night true → per_night, false → per_stay
    await queryInterface.sequelize.query(`
      UPDATE booking_addons
      SET pricing_type = CASE
        WHEN is_per_night = true THEN 'per_night'::enum_booking_addons_pricing_type
        ELSE 'per_stay'::enum_booking_addons_pricing_type
      END;
    `);

    // Remove the old is_per_night column
    await queryInterface.removeColumn('booking_addons', 'is_per_night');
  },

  async down(queryInterface, Sequelize) {
    // Add back is_per_night column
    await queryInterface.addColumn('booking_addons', 'is_per_night', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    // Migrate data back
    await queryInterface.sequelize.query(`
      UPDATE booking_addons
      SET is_per_night = CASE
        WHEN pricing_type IN ('per_night', 'per_guest_per_night') THEN true
        ELSE false
      END;
    `);

    // Remove pricing_type column
    await queryInterface.removeColumn('booking_addons', 'pricing_type');

    // Drop the enum type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_booking_addons_pricing_type";
    `);
  },
};
