'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('booking_addons', {
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
      group_addon_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'group_addons',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Reference to original group addon',
      },
      addon_type: {
        type: Sequelize.ENUM(
          'extra_adult',
          'extra_child',
          'extra_bed',
          'breakfast',
          'airport_transfer',
          'late_checkout',
          'early_checkin',
          'other'
        ),
        allowNull: false,
      },
      quantity: {
        type: Sequelize.SMALLINT,
        allowNull: false,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Unit price at time of booking',
      },
      is_per_night: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'true = per night, false = flat fee',
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Pre-calculated total',
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
    await queryInterface.addIndex('booking_addons', ['booking_id']);
    await queryInterface.addIndex('booking_addons', ['group_addon_id']);
    await queryInterface.addIndex('booking_addons', ['addon_type']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('booking_addons');
  },
};
