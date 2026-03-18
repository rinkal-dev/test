'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('webhook_delivery_logs', {
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
      webhook_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'webhooks',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      event_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Event type that triggered this delivery',
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Full webhook payload sent',
      },
      response_status: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'HTTP response status code',
      },
      response_body: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Response body (truncated)',
      },
      duration_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'Request duration in milliseconds',
      },
      attempt_number: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        defaultValue: 1,
        comment: 'Which attempt this is (1, 2, 3...)',
      },
      status: {
        type: Sequelize.ENUM('pending', 'success', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Error message if delivery failed',
      },
      next_retry_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Scheduled time for next retry attempt',
      },
      created_at: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.DATE,
      },
    });

    // Add indexes for efficient querying
    await queryInterface.addIndex('webhook_delivery_logs', ['webhook_id']);
    await queryInterface.addIndex('webhook_delivery_logs', ['event_type']);
    await queryInterface.addIndex('webhook_delivery_logs', ['status']);
    await queryInterface.addIndex('webhook_delivery_logs', ['created_at']);
    await queryInterface.addIndex('webhook_delivery_logs', ['next_retry_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('webhook_delivery_logs');
  },
};
