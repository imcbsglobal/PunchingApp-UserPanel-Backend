# IMC Punch System API

A robust backend API for employee punch-in/punch-out management with photo verification and location tracking.

![Node.js](https://img.shields.io/badge/Node.js-14.x-green)
![Express](https://img.shields.io/badge/Express-4.x-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13.x-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🚀 Features

- ✅ **Authentication**: Secure JWT-based authentication
- 📸 **Photo Verification**: Photo required at punch-in with optional photo at punch-out
- 📍 **Location Tracking**: Records location at punch-in and punch-out times
- 👥 **Customer Management**: Track time spent with specific customers
- 👤 **User Roles**: Different permissions for regular users and admins
- 📊 **Admin Dashboard**: View all records by date and recent activity
- ☁️ **Image Storage**: Cloudinary integration for reliable image storage and access

## 📋 Requirements

- Node.js (v14 or higher)
- PostgreSQL database
- Cloudinary account

## 🛠️ Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/imc-punch-system.git
cd imc-punch-system
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory with the following variables:

```
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/imc_punch_app

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=90d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

4. **Set up database**

```bash
# Create tables in PostgreSQL
psql -U your_user -d your_database < setup/schema.sql

# Optional: Seed with test data
psql -U your_user -d your_database < setup/seed.sql
```

5. **Start the server**

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## 📚 API Documentation

### Authentication

| Method | Endpoint          | Description                      |
| ------ | ----------------- | -------------------------------- |
| POST   | `/api/auth/login` | Login with username and password |

### Punch Operations

| Method | Endpoint               | Description                             |
| ------ | ---------------------- | --------------------------------------- |
| GET    | `/api/punch/customers` | Get list of customers                   |
| POST   | `/api/punch/punch-in`  | Record punch-in with photo and location |
| POST   | `/api/punch/punch-out` | Record punch-out with optional photo    |
| GET    | `/api/punch/pending`   | Get user's pending punch records        |
| GET    | `/api/punch/completed` | Get user's completed punch records      |
| GET    | `/api/punch/:id`       | Get specific punch record               |

### Admin Routes

| Method | Endpoint                | Description                                 |
| ------ | ----------------------- | ------------------------------------------- |
| GET    | `/api/punch/date/:date` | Get all punches for specific date           |
| GET    | `/api/punch/recent`     | Get all recent punches (defaults to 5 days) |

## 📁 Project Structure

```
imc-punch-system/
├── app.js                  # Express app setup
├── server.js               # Server entry point
├── config/                 # Configuration files
│   ├── cloudinary.js       # Cloudinary setup
│   ├── db.js               # Database connection
│   └── winston.js          # Logging configuration
├── controllers/            # Route controllers
│   ├── authController.js   # Authentication logic
│   └── punchController.js  # Punch record operations
├── middleware/             # Express middleware
│   ├── auth.js             # JWT authentication
│   ├── asyncHandler.js     # Async error handling
│   └── errorHandler.js     # Global error handling
├── models/                 # Database models
│   ├── punchModel.js       # Punch record model
│   └── userModel.js        # User model
├── routes/                 # API routes
│   ├── authRoutes.js       # Auth routes
│   └── punchRoutes.js      # Punch record routes
├── scripts/                # Utility scripts
│   └── migrateImagesToCloudinary.js  # Migration script
└── uploads/                # Local file storage (temporary)
```

## 🔄 Data Flow

1. User authenticates to get JWT token
2. User makes authenticated requests to punch-in/punch-out endpoints
3. Photos are uploaded to Cloudinary
4. Location and time data is verified
5. Records are stored in PostgreSQL database
6. Admin can view all records through admin endpoints

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- Express.js team for the excellent web framework
- Cloudinary for the image hosting solution
- Contributors who have dedicated time to improve this project
