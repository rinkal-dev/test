'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create the pricing_type enum
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_group_addons_pricing_type" AS ENUM (
        'per_stay',
        'per_night',
        'per_guest',
        'per_guest_per_night'
      );
    `);

    // Add the pricing_type column
    await queryInterface.addColumn('group_addons', 'pricing_type', {
      type: Sequelize.ENUM('per_stay', 'per_night', 'per_guest', 'per_guest_per_night'),
      allowNull: false,
      defaultValue: 'per_stay',
      comment: 'How the addon price is calculated',
    });

    // Migrate existing data: is_per_night true → per_night, false → per_stay
    await queryInterface.sequelize.query(`
      UPDATE group_addons
      SET pricing_type = CASE
        WHEN is_per_night = true THEN 'per_night'::enum_group_addons_pricing_type
        ELSE 'per_stay'::enum_group_addons_pricing_type
      END;
    `);

    // Remove the old is_per_night column
    await queryInterface.removeColumn('group_addons', 'is_per_night');
  },

  async down(queryInterface, Sequelize) {
    // Add back is_per_night column
    await queryInterface.addColumn('group_addons', 'is_per_night', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    // Migrate data back
    await queryInterface.sequelize.query(`
      UPDATE group_addons
      SET is_per_night = CASE
        WHEN pricing_type IN ('per_night', 'per_guest_per_night') THEN true
        ELSE false
      END;
    `);

    // Remove pricing_type column
    await queryInterface.removeColumn('group_addons', 'pricing_type');

    // Drop the enum type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_group_addons_pricing_type";
    `);
  },
};
