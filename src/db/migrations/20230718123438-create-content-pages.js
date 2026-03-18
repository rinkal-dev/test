'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('content_pages', {
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
      title: {
        allowNull: false,
        type: Sequelize.STRING(100),
      },
      slug: {
        allowNull: false,
        type: Sequelize.STRING(50),
      },
      content: {
        allowNull: false,
        type: Sequelize.TEXT('long'),
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
    await queryInterface.dropTable('content_pages');
  },
};
