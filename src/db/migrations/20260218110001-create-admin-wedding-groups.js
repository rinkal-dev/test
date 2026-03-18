'use strict';

/**
 * Migration: Create admin_wedding_groups junction table
 *
 * This table links admins (Group Managers) to wedding groups they manage.
 * Enables the "Assign Groups to Manager" feature (UM-011).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('admin_wedding_groups', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      admin_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'admins',
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
          model: 'admins',
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
    await queryInterface.addIndex('admin_wedding_groups', ['admin_id', 'wedding_group_id'], {
      unique: true,
      name: 'unique_admin_wedding_group',
    });

    // Add index for faster lookups
    await queryInterface.addIndex('admin_wedding_groups', ['wedding_group_id'], {
      name: 'idx_admin_wedding_groups_wedding_group_id',
    });

    await queryInterface.addIndex('admin_wedding_groups', ['admin_id'], {
      name: 'idx_admin_wedding_groups_admin_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('admin_wedding_groups');
  },
};
