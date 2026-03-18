'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('api_keys', {
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
        comment: 'Descriptive name for the API key (e.g., "N8N Production")',
      },
      key_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Hashed API key (never store plain key)',
      },
      key_prefix: {
        type: Sequelize.STRING(12),
        allowNull: false,
        comment: 'First chars of key for identification (e.g., "dsk_abc1")',
      },
      permissions: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Array of allowed endpoints/scopes',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      last_used_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
      last_used_ip: {
        type: Sequelize.STRING(45),
        allowNull: true,
        defaultValue: null,
        comment: 'IP address of last API call',
      },
      usage_count: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total number of API calls made',
      },
      rate_limit: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'Requests per hour limit (null = unlimited)',
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Optional expiration date',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Optional description of key purpose',
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
    await queryInterface.addIndex('api_keys', ['key_prefix']);
    await queryInterface.addIndex('api_keys', ['is_active']);
    await queryInterface.addIndex('api_keys', ['expires_at']);
    await queryInterface.addIndex('api_keys', ['created_by']);
    await queryInterface.addIndex('api_keys', ['deleted_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('api_keys');
  },
};
