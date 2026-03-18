'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('social_logins', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      user_id: {
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        type: Sequelize.BIGINT,
      },
      social_id: {
        allowNull: false,
        type: Sequelize.STRING(250),
      },
      type: {
        allowNull: false,
        comment: '1 = Google, 2 = Facebook, 3 = Twitter, 4 = Apple',
        type: Sequelize.SMALLINT,
      },
      data: {
        allowNull: false,
        type: Sequelize.TEXT('long'),
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
    await queryInterface.dropTable('social_logins');
  },
};
