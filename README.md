# DestaPay Group - Backend API

## Wedding Group Hotel Booking Platform

A NestJS backend API for DestaPay - a wedding group hotel booking platform that manages group hotel bookings, room allocations, itineraries, and payment tracking.

## Index

1. [Prerequisites](#prerequisites)
2. [Tech Stack](#tech-stack)
3. [Installation](#installation)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [Running the Project](#running-the-project)
7. [API Documentation](#api-documentation)
8. [Project Structure](#project-structure)

---

## Prerequisites

| Requirement  | Version              |
|--------------|----------------------|
| Node.js      | v20.18.0 or higher   |
| PostgreSQL   | v16 or higher        |
| npm          | v10.x or higher      |

---

## Tech Stack

### Core Framework

| Package           | Version  |
|-------------------|----------|
| NestJS            | v10.4.1  |
| TypeScript        | v4.3.5   |
| Sequelize ORM     | v6.32.1  |
| PostgreSQL Driver | v8.11.3  |

### Authentication & Security

| Package          | Version |
|------------------|---------|
| @nestjs/jwt      | v10.2.0 |
| @nestjs/passport | v10.0.3 |
| passport         | v0.5.3  |
| passport-jwt     | v4.0.0  |
| passport-local   | v1.0.0  |
| bcrypt           | v5.0.1  |

### Additional Services

| Package                  | Version  | Purpose              |
|--------------------------|----------|----------------------|
| @nestjs-modules/mailer   | v2.0.2   | Email service        |
| @nestjs/swagger          | v7.4.0   | API documentation    |
| @aws-sdk/client-s3       | v3.972.0 | S3 file storage      |
| nestjs-i18n              | v9.1.1   | Internationalization |
| winston                  | v3.19.0  | Logging              |
| class-validator          | v0.13.2  | DTO validation       |

---

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd destawed-group
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment file

```bash
cp .env.example .env
```

### 4. Configure the `.env` file (see Environment Variables section below)

---

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Application Settings

```env
APP_NAME="DestaPay"
APP_PORT=3002
APP_PREFIX=api
APP_URL=http://localhost:3002
NODE_ENV=development
```

### Database Configuration (Required)

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=destapay_db
DB_USERNAME=postgres
DB_PASSWORD=your_secure_password
```

### JWT Configuration (Required)

```env
JWT_SECRET=your_unique_secure_secret_key
JWT_ACCESS_TIME=3h
JWT_REFRESH_TIME=5h
```

### Email/SMTP Configuration (Required for password reset)

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS=your_email@gmail.com
MAIL_FROM_NAME=DestaPay
FRONTEND_URL=http://localhost:3001
MAIL_FRONTEND_URL=${FRONTEND_URL}/admin/reset-password
```

### Storage Configuration (Optional - defaults to local)

```env
# Options: local, s3, supabase
STORAGE_PROVIDER=local

# Local Storage
LOCAL_UPLOAD_DIR=uploads
LOCAL_UPLOAD_BASE_URL=${APP_URL}/uploads

# S3 Storage (if STORAGE_PROVIDER=s3)
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_ENDPOINT=
S3_BASE_URL=

# Supabase Storage (if STORAGE_PROVIDER=supabase)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
SUPABASE_STORAGE_BUCKET=uploads
```

### HTTPS Configuration (Optional - for production)

```env
ENABLE_HTTPS=false
SERVER_PRIVATE_KEY_PATH=
SERVER_CERTIFICATE_PATH=
```

### Swagger Configuration

```env
SWAGGER_PROJECT_BRIEF="DestaPay Group - Wedding Hotel Booking API"
SWAGGER_API_VERSION=1.0
```

---

## Database Setup

### Run migrations

```bash
npm run db:migrate
```

### Run seeders (optional - adds initial data)

```bash
npm run seed
```

### Other database commands

| Command                    | Description              |
|----------------------------|--------------------------|
| `npm run db:migrate`       | Run pending migrations   |
| `npm run db:migrate:undo`  | Undo last migration      |
| `npm run db:migrate:undo:all` | Reset all migrations  |
| `npm run seed`             | Run seeders              |
| `npm run seed:refresh`     | Refresh seeders          |
| `npm run model:create`     | Create new model         |
| `npm run migration:generate` | Generate migration file |

---

## Running the Project

### Development

```bash
npm run start:dev
```

### Production

```bash
npm run build
npm run start:prod
```

### Other Commands

| Command             | Description                |
|---------------------|----------------------------|
| `npm run build`     | Build the application      |
| `npm run start`     | Start the application      |
| `npm run start:dev` | Start in watch mode        |
| `npm run lint`      | Run ESLint                 |
| `npm run format`    | Format code with Prettier  |
| `npm run test`      | Run unit tests             |
| `npm run test:e2e`  | Run end-to-end tests       |

---

## API Documentation

Swagger UI is available at the following endpoints after starting the server:

| Endpoint                     | Description              |
|------------------------------|--------------------------|
| `/api/v1/documentation`      | Public API documentation |
| `/api/v1/admin/documentation`| Admin API documentation  |

---

## Project Structure

```
src/
├── auth/                  # Authentication strategies & guards
├── config/                # Configuration files
├── core/                  # Core modules & repositories
├── db/
│   ├── migrations/        # Database migrations
│   ├── models/            # Sequelize models
│   └── seeders/           # Database seeders
├── i18n/                  # Internationalization files
├── modules/
│   ├── admin/             # Admin modules
│   │   ├── admin-auth/
│   │   ├── hotels/
│   │   ├── roles/
│   │   ├── permissions/
│   │   ├── users/
│   │   ├── wedding-groups/
│   │   └── ...
│   └── public/            # Public API modules
├── services/              # Shared services
├── views/                 # Email templates (Pug)
└── main.ts                # Application entry point
```

---

## Notes

- Default storage provider is `local` - files are stored in the `/uploads` directory
- For production, consider using S3 or Supabase for file storage
- Ensure all required environment variables are set before starting the server
- Use strong, unique values for `JWT_SECRET` in production

**HAPPY CODING :+1: :computer:**
