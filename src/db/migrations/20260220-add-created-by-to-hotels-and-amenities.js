'use strict';

/**
 * Migration: Add created_by column to hotels and amenities tables
 * Tracks which admin created these records (for data ownership filtering)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add created_by to hotels table
    await queryInterface.addColumn('hotels', 'created_by', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'admins',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Add created_by to amenities table
    await queryInterface.addColumn('amenities', 'created_by', {
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
    await queryInterface.addIndex('hotels', ['created_by'], {
      name: 'idx_hotels_created_by',
    });

    await queryInterface.addIndex('amenities', ['created_by'], {
      name: 'idx_amenities_created_by',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('hotels', 'idx_hotels_created_by');
    await queryInterface.removeIndex('amenities', 'idx_amenities_created_by');
    await queryInterface.removeColumn('hotels', 'created_by');
    await queryInterface.removeColumn('amenities', 'created_by');
  },
};
