'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Change bed_type from ENUM to VARCHAR(100)
    await queryInterface.changeColumn('room_types', 'bed_type', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert back to ENUM (note: this may fail if data doesn't match enum values)
    await queryInterface.changeColumn('room_types', 'bed_type', {
      type: Sequelize.ENUM('king', 'queen', 'twin', 'double', 'single', 'other'),
      allowNull: true,
      defaultValue: null,
    });
  },
};
