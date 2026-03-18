'use strict';

/**
 * Migration: Create user_wedding_groups junction table
 *
 * This table links users (Group Managers) to wedding groups they manage.
 * Enables the "Assign Groups to Manager" feature (UM-011).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_wedding_groups', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      wedding_group_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'wedding_groups',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      assigned_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      assigned_by: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add unique constraint to prevent duplicate assignments
    await queryInterface.addIndex('user_wedding_groups', ['user_id', 'wedding_group_id'], {
      unique: true,
      name: 'unique_user_wedding_group',
    });

    // Add index for faster lookups by wedding_group_id
    await queryInterface.addIndex('user_wedding_groups', ['wedding_group_id'], {
      name: 'idx_user_wedding_groups_wedding_group_id',
    });

    // Add index for faster lookups by user_id
    await queryInterface.addIndex('user_wedding_groups', ['user_id'], {
      name: 'idx_user_wedding_groups_user_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_wedding_groups');
  },
};
