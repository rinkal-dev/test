'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('activity_logs', {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        unique: true,
      },
      // Who performed the action
      admin_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'admins',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      // Action type: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, VIEW, etc.
      action: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      // Target entity type: booking, guest, wedding_group, hotel, payment, etc.
      entity_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      // Target entity ID (UUID or ID as string)
      entity_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      // Target entity name (human-readable label)
      entity_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      // Human-readable description
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      // Additional details as JSON (old values, new values, etc.)
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      // IP address of the request
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      // User agent string
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      // Request URL/path
      request_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      // Request method (GET, POST, etc.)
      request_method: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Indexes for performance
    await queryInterface.addIndex('activity_logs', ['admin_id'], {
      name: 'idx_activity_logs_admin',
    });
    await queryInterface.addIndex('activity_logs', ['action'], {
      name: 'idx_activity_logs_action',
    });
    await queryInterface.addIndex('activity_logs', ['entity_type'], {
      name: 'idx_activity_logs_entity_type',
    });
    await queryInterface.addIndex('activity_logs', ['entity_type', 'entity_id'], {
      name: 'idx_activity_logs_entity',
    });
    await queryInterface.addIndex('activity_logs', ['created_at'], {
      name: 'idx_activity_logs_created_at',
    });
    await queryInterface.addIndex('activity_logs', ['admin_id', 'action', 'created_at'], {
      name: 'idx_activity_logs_composite',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('activity_logs');
  },
};
