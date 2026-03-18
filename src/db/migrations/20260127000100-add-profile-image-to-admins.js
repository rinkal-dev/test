'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const adminsColumns = await queryInterface.describeTable('admins');

    if (!adminsColumns.profile_image) {
      await queryInterface.addColumn('admins', 'profile_image', {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null,
        after: 'mobile_verified_at'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const adminsColumns = await queryInterface.describeTable('admins');

    if (adminsColumns.profile_image) {
      await queryInterface.removeColumn('admins', 'profile_image');
    }
  }
};
