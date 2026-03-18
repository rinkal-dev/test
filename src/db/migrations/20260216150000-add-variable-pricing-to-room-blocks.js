'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add variable pricing columns to group_room_blocks
    await queryInterface.addColumn('group_room_blocks', 'rate_sun_wed', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
      after: 'price_per_night',
    });

    await queryInterface.addColumn('group_room_blocks', 'rate_thu_sat', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
      after: 'rate_sun_wed',
    });

    await queryInterface.addColumn('group_room_blocks', 'base_occupancy', {
      type: Sequelize.SMALLINT,
      allowNull: false,
      defaultValue: 2,
      after: 'rate_thu_sat',
    });

    await queryInterface.addColumn('group_room_blocks', 'extra_adult_per_night', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
      after: 'base_occupancy',
    });

    await queryInterface.addColumn('group_room_blocks', 'extra_child_per_night', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      after: 'extra_adult_per_night',
    });

    await queryInterface.addColumn('group_room_blocks', 'extra_teen_per_night', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      after: 'extra_child_per_night',
    });

    // Migrate existing data: copy price_per_night to both rate columns
    await queryInterface.sequelize.query(`
      UPDATE group_room_blocks
      SET rate_sun_wed = price_per_night,
          rate_thu_sat = price_per_night
      WHERE rate_sun_wed IS NULL AND price_per_night IS NOT NULL
    `);

    // Add columns to booking_rooms for detailed tracking
    await queryInterface.addColumn('booking_rooms', 'teens', {
      type: Sequelize.SMALLINT,
      allowNull: false,
      defaultValue: 0,
      after: 'children',
    });

    await queryInterface.addColumn('booking_rooms', 'extra_person_charges', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      after: 'subtotal',
    });

    await queryInterface.addColumn('booking_rooms', 'price_breakdown', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null,
      after: 'extra_person_charges',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove booking_rooms columns
    await queryInterface.removeColumn('booking_rooms', 'price_breakdown');
    await queryInterface.removeColumn('booking_rooms', 'extra_person_charges');
    await queryInterface.removeColumn('booking_rooms', 'teens');

    // Remove group_room_blocks columns
    await queryInterface.removeColumn('group_room_blocks', 'extra_teen_per_night');
    await queryInterface.removeColumn('group_room_blocks', 'extra_child_per_night');
    await queryInterface.removeColumn('group_room_blocks', 'extra_adult_per_night');
    await queryInterface.removeColumn('group_room_blocks', 'base_occupancy');
    await queryInterface.removeColumn('group_room_blocks', 'rate_thu_sat');
    await queryInterface.removeColumn('group_room_blocks', 'rate_sun_wed');
  },
};
