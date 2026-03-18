'use strict';

/**
 * Migration: Add created_by column to admins table
 * Tracks which admin created another admin (for sub-admin management)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add created_by column to admins table
    await queryInterface.addColumn('admins', 'created_by', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'admins',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Add index for faster filtering
    await queryInterface.addIndex('admins', ['created_by'], {
      name: 'idx_admins_created_by',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('admins', 'idx_admins_created_by');
    await queryInterface.removeColumn('admins', 'created_by');
  },
};
