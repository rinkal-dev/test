'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('app_version_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      android_version: {
        allowNull: false,
        type: Sequelize.INTEGER,
      },
      is_android_force_update: {
        allowNull: false,
        defaultValue: false,
        type: Sequelize.BOOLEAN,
      },
      ios_version: {
        allowNull: false,
        type: Sequelize.INTEGER,
      },
      is_ios_force_update: {
        allowNull: false,
        defaultValue: false,
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
    await queryInterface.dropTable('app_version_logs');
  },
};
