'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('roles', 'created_by', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'admins',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      after: 'uuid',
    });

    // Add index for filtering
    await queryInterface.addIndex('roles', ['created_by'], {
      name: 'idx_roles_created_by',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('roles', 'idx_roles_created_by');
    await queryInterface.removeColumn('roles', 'created_by');
  },
};
