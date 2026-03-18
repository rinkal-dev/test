'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Migration: Create Amenities Module
 *
 * Creates:
 * 1. amenities table - Master list of amenities with icons
 * 2. hotel_amenities junction table - Links hotels to amenities
 * 3. Permissions for amenities management
 * 4. Seeds default amenities
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create amenities table
    await queryInterface.createTable('amenities', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      icon: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'star',
        comment: 'Lucide icon name (e.g., wifi, waves, car, utensils)',
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'general',
        comment: 'Category for grouping (connectivity, recreation, dining, services, general)',
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // 2. Create hotel_amenities junction table
    await queryInterface.createTable('hotel_amenities', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      hotel_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'hotels',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      amenity_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'amenities',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add unique constraint to prevent duplicates
    await queryInterface.addIndex('hotel_amenities', ['hotel_id', 'amenity_id'], {
      unique: true,
      name: 'unique_hotel_amenity',
    });

    // 3. Add permissions for amenities
    const permissions = [
      { uuid: uuidv4(), name: 'amenities.view', created_at: new Date() },
      { uuid: uuidv4(), name: 'amenities.create', created_at: new Date() },
      { uuid: uuidv4(), name: 'amenities.edit', created_at: new Date() },
      { uuid: uuidv4(), name: 'amenities.delete', created_at: new Date() },
    ];

    await queryInterface.bulkInsert('permissions', permissions);

    // 4. Seed default amenities
    const defaultAmenities = [
      // Connectivity
      { uuid: uuidv4(), name: 'Free WiFi', icon: 'wifi', category: 'connectivity', sort_order: 1, created_at: new Date() },
      { uuid: uuidv4(), name: 'Business Center', icon: 'briefcase', category: 'connectivity', sort_order: 2, created_at: new Date() },

      // Recreation
      { uuid: uuidv4(), name: 'Swimming Pool', icon: 'waves', category: 'recreation', sort_order: 10, created_at: new Date() },
      { uuid: uuidv4(), name: 'Fitness Center', icon: 'dumbbell', category: 'recreation', sort_order: 11, created_at: new Date() },
      { uuid: uuidv4(), name: 'Spa & Wellness', icon: 'sparkles', category: 'recreation', sort_order: 12, created_at: new Date() },
      { uuid: uuidv4(), name: 'Beach Access', icon: 'umbrella', category: 'recreation', sort_order: 13, created_at: new Date() },
      { uuid: uuidv4(), name: 'Golf Course', icon: 'flag', category: 'recreation', sort_order: 14, created_at: new Date() },
      { uuid: uuidv4(), name: 'Tennis Courts', icon: 'circle-dot', category: 'recreation', sort_order: 15, created_at: new Date() },

      // Dining
      { uuid: uuidv4(), name: 'Restaurant', icon: 'utensils', category: 'dining', sort_order: 20, created_at: new Date() },
      { uuid: uuidv4(), name: 'Bar & Lounge', icon: 'wine', category: 'dining', sort_order: 21, created_at: new Date() },
      { uuid: uuidv4(), name: 'Room Service', icon: 'concierge-bell', category: 'dining', sort_order: 22, created_at: new Date() },
      { uuid: uuidv4(), name: 'Breakfast Included', icon: 'coffee', category: 'dining', sort_order: 23, created_at: new Date() },

      // Services
      { uuid: uuidv4(), name: 'Free Parking', icon: 'car', category: 'services', sort_order: 30, created_at: new Date() },
      { uuid: uuidv4(), name: 'Valet Parking', icon: 'key', category: 'services', sort_order: 31, created_at: new Date() },
      { uuid: uuidv4(), name: 'Airport Shuttle', icon: 'plane', category: 'services', sort_order: 32, created_at: new Date() },
      { uuid: uuidv4(), name: '24/7 Front Desk', icon: 'clock', category: 'services', sort_order: 33, created_at: new Date() },
      { uuid: uuidv4(), name: 'Concierge Service', icon: 'user-check', category: 'services', sort_order: 34, created_at: new Date() },
      { uuid: uuidv4(), name: 'Laundry Service', icon: 'shirt', category: 'services', sort_order: 35, created_at: new Date() },

      // Room Features
      { uuid: uuidv4(), name: 'Air Conditioning', icon: 'thermometer-snowflake', category: 'room', sort_order: 40, created_at: new Date() },
      { uuid: uuidv4(), name: 'Mini Bar', icon: 'glass-water', category: 'room', sort_order: 41, created_at: new Date() },
      { uuid: uuidv4(), name: 'Safe Box', icon: 'lock', category: 'room', sort_order: 42, created_at: new Date() },
      { uuid: uuidv4(), name: 'Flat Screen TV', icon: 'tv', category: 'room', sort_order: 43, created_at: new Date() },
      { uuid: uuidv4(), name: 'Balcony', icon: 'door-open', category: 'room', sort_order: 44, created_at: new Date() },
      { uuid: uuidv4(), name: 'Ocean View', icon: 'sunrise', category: 'room', sort_order: 45, created_at: new Date() },

      // Accessibility
      { uuid: uuidv4(), name: 'Wheelchair Accessible', icon: 'accessibility', category: 'accessibility', sort_order: 50, created_at: new Date() },
      { uuid: uuidv4(), name: 'Elevator', icon: 'arrow-up-down', category: 'accessibility', sort_order: 51, created_at: new Date() },

      // Family
      { uuid: uuidv4(), name: 'Kids Club', icon: 'baby', category: 'family', sort_order: 60, created_at: new Date() },
      { uuid: uuidv4(), name: 'Babysitting Service', icon: 'heart-handshake', category: 'family', sort_order: 61, created_at: new Date() },

      // Pet
      { uuid: uuidv4(), name: 'Pet Friendly', icon: 'paw-print', category: 'pet', sort_order: 70, created_at: new Date() },
    ];

    await queryInterface.bulkInsert('amenities', defaultAmenities);
  },

  async down(queryInterface, Sequelize) {
    // Remove junction table first
    await queryInterface.dropTable('hotel_amenities');

    // Remove amenities table
    await queryInterface.dropTable('amenities');

    // Remove permissions
    await queryInterface.bulkDelete('permissions', {
      name: {
        [Sequelize.Op.in]: [
          'amenities.view',
          'amenities.create',
          'amenities.edit',
          'amenities.delete',
        ],
      },
    });
  }
};
