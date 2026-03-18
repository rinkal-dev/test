'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add room_block_id column
    await queryInterface.addColumn('booking_rooms', 'room_block_id', {
      type: Sequelize.BIGINT,
      allowNull: true, // Nullable for backward compatibility with existing data
      references: {
        model: 'group_room_blocks',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      after: 'room_type_id',
    });

    // Add total_nights column (needed for price calculation)
    await queryInterface.addColumn('booking_rooms', 'total_nights', {
      type: Sequelize.SMALLINT,
      allowNull: false,
      defaultValue: 1,
      after: 'price_per_night',
    });

    // Add index for room_block_id
    await queryInterface.addIndex('booking_rooms', ['room_block_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('booking_rooms', ['room_block_id']);
    await queryInterface.removeColumn('booking_rooms', 'total_nights');
    await queryInterface.removeColumn('booking_rooms', 'room_block_id');
  },
};
