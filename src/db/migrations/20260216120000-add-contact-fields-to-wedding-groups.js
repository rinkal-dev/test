'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add bride contact fields
    await queryInterface.addColumn('wedding_groups', 'bride_email', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn('wedding_groups', 'bride_phone', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: null,
    });

    // Add groom contact fields
    await queryInterface.addColumn('wedding_groups', 'groom_email', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn('wedding_groups', 'groom_phone', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: null,
    });

    // Add hotel contact fields
    await queryInterface.addColumn('wedding_groups', 'hotel_contact_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn('wedding_groups', 'hotel_contact_email', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn('wedding_groups', 'hotel_contact_phone', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: null,
    });

    // Add admin internal notes (for internal tracking)
    await queryInterface.addColumn('wedding_groups', 'admin_notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
    });

    // Add external booking reference (hotel's booking/confirmation number)
    await queryInterface.addColumn('wedding_groups', 'external_booking_ref', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('wedding_groups', 'bride_email');
    await queryInterface.removeColumn('wedding_groups', 'bride_phone');
    await queryInterface.removeColumn('wedding_groups', 'groom_email');
    await queryInterface.removeColumn('wedding_groups', 'groom_phone');
    await queryInterface.removeColumn('wedding_groups', 'hotel_contact_name');
    await queryInterface.removeColumn('wedding_groups', 'hotel_contact_email');
    await queryInterface.removeColumn('wedding_groups', 'hotel_contact_phone');
    await queryInterface.removeColumn('wedding_groups', 'admin_notes');
    await queryInterface.removeColumn('wedding_groups', 'external_booking_ref');
  }
};
