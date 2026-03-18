'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('role_has_permissions', {
      permission_id: {
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'permissions',
          key: 'id',
        },
        type: Sequelize.BIGINT,
      },
      role_id: {
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'roles',
          key: 'id',
        },
        type: Sequelize.BIGINT,
      },
    });

    await queryInterface.addIndex('role_has_permissions', ['role_id'], {
      name: 'model_has_permissions_role_id_index',
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('role_has_permissions');
  },
};
