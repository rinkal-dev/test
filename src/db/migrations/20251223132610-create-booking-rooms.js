'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('booking_rooms', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      uuid: {
        type: Sequelize.CHAR(36),
        unique: true,
        allowNull: false,
      },
      booking_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'bookings',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      room_type_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'room_types',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      quantity: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        comment: 'Number of rooms',
      },
      adults: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        comment: 'Number of adults for this room selection',
      },
      children: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of children for this room selection',
      },
      price_per_night: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Price at time of booking',
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Pre-calculated: quantity × price × nights',
      },
      created_at: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.DATE,
      },
    });

    // Add indexes
    await queryInterface.addIndex('booking_rooms', ['booking_id']);
    await queryInterface.addIndex('booking_rooms', ['room_type_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('booking_rooms');
  },
};
