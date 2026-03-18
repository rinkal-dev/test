'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
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

      username: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },

      email: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
        unique: true,
      },

      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      remember_token: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: null,
      },

      locale: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'en',
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: '0 = Inactive, 1 = Active',
      },

      isd_code: {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: null,
      },

      mobile: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: null,
      },

      email_otp: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
      },

      email_otp_expired_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },

      email_verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },

      mobile_otp: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
      },

      mobile_otp_expired_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },

      mobile_verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },

      profile_photo: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
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
    await queryInterface.dropTable('users');
  },
};
