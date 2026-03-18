'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payments', {
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
      payment_type: {
        type: Sequelize.ENUM('deposit', 'final'),
        allowNull: false,
      },
      payment_gateway: {
        type: Sequelize.ENUM('stripe', 'wetravel', 'manual'),
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
        comment: 'Gateway transaction/charge ID',
      },
      payment_intent_id: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
        comment: 'Stripe payment intent ID (for refunds)',
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'success', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending',
      },
      failure_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Additional gateway response data',
      },
      paid_at: {
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
    await queryInterface.addIndex('payments', ['booking_id']);
    await queryInterface.addIndex('payments', ['payment_type']);
    await queryInterface.addIndex('payments', ['payment_gateway']);
    await queryInterface.addIndex('payments', ['status']);
    await queryInterface.addIndex('payments', ['transaction_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('payments');
  },
};
