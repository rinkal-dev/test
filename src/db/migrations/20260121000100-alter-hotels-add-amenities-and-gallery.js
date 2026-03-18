'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add amenities JSON column for hotel amenities (e.g., ['All-Inclusive', 'Beachfront'])
    await queryInterface.addColumn('hotels', 'amenities', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Hotel amenities list as JSON array',
    });

    // Add gallery_images JSON column for multiple hotel images
    await queryInterface.addColumn('hotels', 'gallery_images', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Array of hotel gallery image URLs or base64 data',
    });

    // Change image_url from VARCHAR(255) to TEXT to support base64-encoded images
    await queryInterface.changeColumn('hotels', 'image_url', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove gallery_images column
    await queryInterface.removeColumn('hotels', 'gallery_images');

    // Remove amenities column
    await queryInterface.removeColumn('hotels', 'amenities');

    // Revert image_url to VARCHAR(255) - note: this may truncate data!
    await queryInterface.changeColumn('hotels', 'image_url', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    });
  },
};
