'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add password field
    await queryInterface.addColumn('guests', 'password', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    // Add password_set_at timestamp
    await queryInterface.addColumn('guests', 'password_set_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add password_reset_token for password reset flow
    await queryInterface.addColumn('guests', 'password_reset_token', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    // Add password_reset_expires for token expiry
    await queryInterface.addColumn('guests', 'password_reset_expires', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add set_password_token for initial password setup via email link
    await queryInterface.addColumn('guests', 'set_password_token', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    // Add set_password_token_expires for token expiry
    await queryInterface.addColumn('guests', 'set_password_token_expires', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('guests', 'password');
    await queryInterface.removeColumn('guests', 'password_set_at');
    await queryInterface.removeColumn('guests', 'password_reset_token');
    await queryInterface.removeColumn('guests', 'password_reset_expires');
    await queryInterface.removeColumn('guests', 'set_password_token');
    await queryInterface.removeColumn('guests', 'set_password_token_expires');
  },
};
