'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('activity_logs');
    if (!tableDesc.entity_name) {
      await queryInterface.addColumn('activity_logs', 'entity_name', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('activity_logs', 'entity_name');
  },
};
