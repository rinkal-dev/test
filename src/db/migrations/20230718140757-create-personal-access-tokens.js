'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('personal_access_tokens', {
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
      tokenable_type: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      tokenable_id: {
        allowNull: false,
        type: Sequelize.BIGINT,
      },
      access_token: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      access_token_expired_at: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.DATE,
      },
      refresh_token: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      refresh_token_expired_at: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.DATE,
      },
      device_name: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      device_type: {
        allowNull: false,
        comment: '1: ios, 2: android, 3:web',
        type: Sequelize.SMALLINT,
      },
      device_id: {
        allowNull: false,
        comment: 'Device unique id',
        type: Sequelize.STRING,
      },
      ip: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      fcm_key: {
        allowNull: true,
        defaultValue: null,
        comment: 'Device firebase token',
        type: Sequelize.STRING,
      },
      abilities: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.TEXT,
      },
      last_used_at: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.DATE,
      },
      expires_at: {
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
    await queryInterface.dropTable('personal_access_tokens');
  },
};
