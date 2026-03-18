'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bookings', {
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
      booking_reference: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false,
        comment: 'Human-readable reference e.g., WED-2024-001234',
      },
      wedding_group_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'wedding_groups',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      guest_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'guests',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      check_in_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      check_out_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      total_rooms: {
        type: Sequelize.SMALLINT,
        allowNull: false,
      },
      total_nights: {
        type: Sequelize.SMALLINT,
        allowNull: false,
      },
      total_adults: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      total_children: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Total booking amount',
      },
      deposit_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Deposit amount',
      },
      final_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Final payment amount',
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      },
      status: {
        type: Sequelize.ENUM('pending', 'deposit_paid', 'confirmed', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      special_requests: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Guest notes/requests',
      },
      deposit_paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
      final_paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
      confirmed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
      cancellation_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
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
    await queryInterface.addIndex('bookings', ['wedding_group_id']);
    await queryInterface.addIndex('bookings', ['guest_id']);
    await queryInterface.addIndex('bookings', ['booking_reference']);
    await queryInterface.addIndex('bookings', ['status']);
    await queryInterface.addIndex('bookings', ['check_in_date']);
    await queryInterface.addIndex('bookings', ['check_out_date']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('bookings');
  },
};
