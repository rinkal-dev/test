'use strict';

/**
 * Fix roles name unique constraint to be a partial index
 * This allows reuse of role names after soft delete
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the existing unique constraint on name
    await queryInterface.removeConstraint('roles', 'roles_name_key');

    // Create a partial unique index that only applies to non-deleted records
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX "roles_name_unique_active"
      ON "roles" ("name")
      WHERE "deleted_at" IS NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Drop the partial unique index
    await queryInterface.removeIndex('roles', 'roles_name_unique_active');

    // Recreate the original unique constraint
    await queryInterface.addConstraint('roles', {
      fields: ['name'],
      type: 'unique',
      name: 'roles_name_key',
    });
  },
};
