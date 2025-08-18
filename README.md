# 🚀 WeFuel - On-Demand Fuel Delivery Platform

WeFuel is a comprehensive on-demand fuel delivery platform designed for Johannesburg, South Africa. The platform connects users, drivers, and fuel stations in a seamless ecosystem similar to Uber Eats or Lyft, but focused on fuel delivery.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

WeFuel consists of three separate applications:

1. **User App** - Customers order fuel (5-25L), track drivers, pay via card/cash, and purchase convenience store items
2. **Driver App** - Drivers accept/reject orders, complete deliveries, access earnings/wallet, referral system, and training modules
3. **Station App** - Fuel stations manage orders, store inventory, promotions, and withdrawals

## ✨ Features

### Core Features
- **User Authentication & FICA Compliance** - Secure signup with South African phone verification
- **Dynamic Pricing Engine** - Real-time load-shedding surcharges, VAT compliance (15% → 16% on 1 May 2025)
- **Payment Integration** - Yoco (card) and Ozow (instant EFT) integration
- **Real-time Tracking** - Live driver location updates via Socket.io
- **Wallet System** - Balance management with withdrawal capabilities
- **Referral System** - Driver referral codes with reduced sign-on fees
- **Training & Compliance** - Driver training modules with quiz requirements
- **Reviews & Ratings** - User feedback system with driver flagging

### Business Logic
- **Dynamic Pricing**: 
  - Load-shedding surcharges (5%, 10%, 15%, 20%, 25%)
  - Area-based surcharges (affluent: +5%, stressed: +2%)
  - Minimum order value enforcement (R100)
- **VAT Enforcement**: Automatic rate changes based on date
- **Revenue Model**: 10% platform commission on orders

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Socket.io** for real-time communication
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Axios** for external API calls
- **Winston** for logging

### Frontend
- **React 18** with functional components and hooks
- **React Router** for navigation
- **React Query** for state management
- **Styled Components** for styling
- **Socket.io Client** for real-time updates
- **React Hook Form** for form handling
- **React Hot Toast** for notifications

### External Services
- **Yoco** - Card payment processing
- **Ozow** - Instant EFT payments
- **EskomSePush API** - Load-shedding data
- **Twilio** - SMS notifications
- **Nodemailer** - Email notifications

## 📁 Project Structure

```
wefuel-app/
├── server/                 # Backend API
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   ├── utils/             # Utilities and helpers
│   ├── socket/            # Socket.io handlers
│   └── index.js           # Server entry point
├── client/                # Frontend React app
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   ├── utils/         # Utilities
│   │   └── styles/        # Global styles
│   └── public/            # Static assets
├── docs/                  # Documentation
└── README.md
```

## 🚀 Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- MongoDB (local or cloud)
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/wefuel-app.git
   cd wefuel-app
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

## ⚙️ Environment Setup

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/wefuel

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key

# External APIs
ESKOM_API_KEY=your-eskom-api-key
YOCO_API_KEY=your-yoco-api-key
OZOW_API_KEY=your-ozow-api-key
OZOW_SITE_CODE=your-ozow-site-code
OZOW_PRIVATE_KEY=your-ozow-private-key

# Notifications
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-phone

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password

# Client Configuration
CLIENT_URL=http://localhost:3000
API_URL=http://localhost:5000
```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
# Start both frontend and backend
npm run dev

# Start only backend
npm run server:dev

# Start only frontend
npm run client:dev
```

### Production Mode
```bash
# Build the frontend
npm run build

# Start production server
npm start
```

### Testing
```bash
# Run all tests
npm test

# Run backend tests only
npm run test:server

# Run frontend tests only
npm run test:client
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/user/signup` - User registration
- `POST /api/auth/user/login` - User login
- `POST /api/auth/driver/signup` - Driver registration
- `POST /api/auth/driver/login` - Driver login
- `POST /api/auth/station/signup` - Station registration
- `POST /api/auth/station/login` - Station login

### Order Endpoints
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get orders
- `GET /api/orders/:id` - Get specific order
- `PUT /api/orders/:id/status` - Update order status

### Payment Endpoints
- `POST /api/payments/process` - Process payment
- `POST /api/payments/refund` - Process refund
- `GET /api/payments/history` - Get payment history

## 🚀 Deployment

### Backend Deployment (Heroku)
```bash
# Install Heroku CLI
heroku create wefuel-api
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-uri
git push heroku main
```

### Frontend Deployment (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel
vercel --prod
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow ESLint configuration
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Email: support@wefuel.co.za
- Documentation: [docs.wefuel.co.za](https://docs.wefuel.co.za)
- Issues: [GitHub Issues](https://github.com/your-username/wefuel-app/issues)

## 🎉 Acknowledgments

- EskomSePush for load-shedding data
- Yoco for payment processing
- Ozow for instant EFT
- MongoDB for database
- React team for the amazing framework

---

**WeFuel** - Fueling Johannesburg, one delivery at a time! ⛽
