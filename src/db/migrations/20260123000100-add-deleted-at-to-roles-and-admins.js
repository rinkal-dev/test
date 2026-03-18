'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add deleted_at to roles table (if not exists)
    const rolesColumns = await queryInterface.describeTable('roles');
    if (!rolesColumns.deleted_at) {
      await queryInterface.addColumn('roles', 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      });
    }

    // Add deleted_at to admins table (if not exists)
    const adminsColumns = await queryInterface.describeTable('admins');
    if (!adminsColumns.deleted_at) {
      await queryInterface.addColumn('admins', 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('roles', 'deleted_at');
    await queryInterface.removeColumn('admins', 'deleted_at');
  },
};
