'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refunds', {
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
        onDelete: 'RESTRICT',
      },
      payment_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'payments',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      refund_gateway: {
        type: Sequelize.ENUM('stripe', 'wetravel', 'manual'),
        allowNull: false,
      },
      refund_type: {
        type: Sequelize.ENUM('full', 'partial'),
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      },
      transaction_id: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
        comment: 'Gateway refund transaction ID',
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Why refund was issued',
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'processed', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      failure_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
      },
      processed_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'admins',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Admin who processed the refund',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Admin notes',
      },
      processed_at: {
        type: Sequelize.DATE,
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
    await queryInterface.addIndex('refunds', ['booking_id']);
    await queryInterface.addIndex('refunds', ['payment_id']);
    await queryInterface.addIndex('refunds', ['refund_gateway']);
    await queryInterface.addIndex('refunds', ['status']);
    await queryInterface.addIndex('refunds', ['transaction_id']);
    await queryInterface.addIndex('refunds', ['processed_by']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('refunds');
  },
};
