'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add price_type column to group_room_blocks
    // 'per_room' = rate is for the entire room (current default behavior)
    // 'per_person' = rate is per person, multiplied by occupancy
    await queryInterface.addColumn('group_room_blocks', 'price_type', {
      type: Sequelize.ENUM('per_room', 'per_person'),
      allowNull: false,
      defaultValue: 'per_room',
      after: 'price_per_night',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('group_room_blocks', 'price_type');
    // Clean up the enum type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_group_room_blocks_price_type";');
  },
};
