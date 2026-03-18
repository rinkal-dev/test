'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('model_has_roles', {
      role_id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      model_type: {
        type: Sequelize.STRING(255),
        primaryKey: true,
        allowNull: false,
      },
      model_id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        allowNull: false,
      },
    });

    await queryInterface.addIndex(
      'model_has_roles',
      ['model_id', 'model_type'],
      { name: 'model_has_roles_model_id_model_type_index' },
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('model_has_roles');
  },
};
