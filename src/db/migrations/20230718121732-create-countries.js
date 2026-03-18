'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('countries', {
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
      name: {
        allowNull: false,
        type: Sequelize.STRING(50),
      },
      code: {
        allowNull: false,
        type: Sequelize.STRING(10),
      },
      isd_code: {
        allowNull: false,
        type: Sequelize.STRING(20),
      },
      currency_code: {
        allowNull: false,
        type: Sequelize.STRING(10),
      },
      emoji: {
        allowNull: false,
        type: Sequelize.STRING(10),
      },
      is_active: {
        allowNull: false,
        defaultValue: true,
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
    await queryInterface.dropTable('countries');
  },
};
