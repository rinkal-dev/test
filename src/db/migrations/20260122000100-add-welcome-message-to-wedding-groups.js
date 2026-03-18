'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('wedding_groups', 'welcome_message', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
      after: 'status',
    });

    await queryInterface.addColumn('wedding_groups', 'image_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
      defaultValue: null,
      after: 'welcome_message',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('wedding_groups', 'image_url');
    await queryInterface.removeColumn('wedding_groups', 'welcome_message');
  },
};
