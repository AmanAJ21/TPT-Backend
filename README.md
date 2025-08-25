# Backend API - Production Ready

A production-ready Node.js backend API built with Express.js, featuring comprehensive security, monitoring, and deployment configurations.

## 🚀 Features

- **Security**: Helmet.js, CORS, rate limiting, JWT authentication
- **Database**: MongoDB with Mongoose ODM
- **Logging**: Winston with structured logging and rotation
- **Monitoring**: Health checks, performance monitoring, error tracking
- **Deployment**: Docker, PM2, and Vercel configurations
- **Testing**: Jest with MongoDB Memory Server
- **Code Quality**: ESLint with security rules

## 📁 Project Structure

```
├── src/
│   ├── config/          # Database and security configuration
│   ├── middleware/      # Custom middleware (auth, logging, monitoring)
│   ├── routes/          # API route handlers
│   ├── models/          # MongoDB models
│   └── utils/           # Utility functions
├── api/                 # Vercel serverless functions
├── tests/               # Test files
├── logs/                # Application logs (auto-generated)
├── docker-compose.yml   # Docker deployment
├── ecosystem.config.js  # PM2 configuration
├── vercel.json         # Vercel deployment config
└── nginx.conf          # Nginx reverse proxy config
```

## 🛠️ Quick Start

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

### Production
```bash
# Start production server
npm start

# Start with PM2
npm run pm2:start

# Deploy to Vercel
vercel
```

## 🌐 API Endpoints

- `GET /health` - Health check
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/users` - Get users (authenticated)
- `GET /api/transport-entries` - Get transport entries (authenticated)

## 🔧 Environment Variables

Copy `.env.production` to `.env` and update with your values:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-super-secure-jwt-secret
CORS_ORIGIN=https://your-frontend-domain.com
```

## 🚀 Deployment Options

### Vercel (Recommended)
See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions.

### Docker
```bash
docker-compose up -d
```

### PM2
```bash
npm run pm2:start
```

## 📊 Monitoring

- **Health Check**: `/health` endpoint
- **Logs**: `logs/` directory with daily rotation
- **Performance**: Built-in response time monitoring
- **Errors**: Structured error logging and tracking

## 🔒 Security Features

- Helmet.js security headers
- CORS protection
- Rate limiting (general + auth-specific)
- JWT authentication
- Input validation
- Error sanitization
- Security-focused ESLint rules

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📚 Documentation

- [Production Deployment Guide](./DEPLOYMENT.md)
- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md)
- [Production Checklist](./PRODUCTION_CHECKLIST.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ for production deployment