'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('webhooks', {
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
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Descriptive name for the webhook (e.g., "N8N Production")',
      },
      url: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'Webhook endpoint URL',
      },
      secret_key: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Secret key for HMAC signature verification',
      },
      events: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Array of event names to subscribe to',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      retry_count: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        defaultValue: 3,
        comment: 'Number of retry attempts on failure',
      },
      timeout_ms: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5000,
        comment: 'Request timeout in milliseconds',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Optional description of webhook purpose',
      },
      last_triggered_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
      created_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'admins',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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
      deleted_at: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.DATE,
      },
    });

    // Add indexes
    await queryInterface.addIndex('webhooks', ['is_active']);
    await queryInterface.addIndex('webhooks', ['created_by']);
    await queryInterface.addIndex('webhooks', ['deleted_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('webhooks');
  },
};
