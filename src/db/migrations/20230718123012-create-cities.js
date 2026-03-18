'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cities', {
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
      state_id: {
        allowNull: false,
        references: {
          model: 'states',
          key: 'id',
        },
        type: Sequelize.BIGINT,
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      is_active: {
        defaultValue: true,
        allowNull: false,
        comment: '0 = Inactive, 1 = Active',
        type: Sequelize.BOOLEAN,
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
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cities');
  },
};
