'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('admins', {
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
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      email_verified_at: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.DATE,
      },
      password: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      remember_token: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.STRING(100),
      },
      locale: {
        allowNull: false,
        defaultValue: 'en',
        type: Sequelize.STRING(10),
      },
      is_active: {
        allowNull: false,
        defaultValue: true,
        comment: '0 = Inactive, 1 = Active',
        type: Sequelize.BOOLEAN,
      },
      mobile: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.STRING(20),
      },
      mobile_verified_at: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.DATE,
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
    await queryInterface.dropTable('admins');
  },
};
