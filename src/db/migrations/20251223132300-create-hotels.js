'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hotels', {
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
      slug: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
        comment: 'URL-friendly identifier',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: null,
      },
      country: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      postal_code: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: null,
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: null,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
      },
      website: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
      },
      star_rating: {
        type: Sequelize.SMALLINT,
        allowNull: true,
        defaultValue: null,
        comment: 'Hotel star rating (1-5)',
      },
      check_in_time: {
        type: Sequelize.TIME,
        allowNull: false,
        defaultValue: '14:00:00',
      },
      check_out_time: {
        type: Sequelize.TIME,
        allowNull: false,
        defaultValue: '11:00:00',
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
        defaultValue: null,
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
        defaultValue: null,
      },
      image_url: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    // Add indexes
    await queryInterface.addIndex('hotels', ['slug']);
    await queryInterface.addIndex('hotels', ['city']);
    await queryInterface.addIndex('hotels', ['country']);
    await queryInterface.addIndex('hotels', ['is_active']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('hotels');
  },
};
