# Vercel Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Prepare Repository
```bash
# Add all files to git
git add .
git commit -m "Production-ready backend for Vercel deployment"
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Set up project settings
# - Deploy
```

#### Option B: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Vercel will auto-detect the Node.js project
5. Click "Deploy"

### 3. Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables, add:

**Required Variables:**
```
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

**Optional Variables:**
```
JWT_EXPIRE=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Your App Name
FRONTEND_URL=https://your-frontend-domain.vercel.app/
LOG_LEVEL=info
```

## 📁 Project Structure for Vercel

```
your-project/
├── api/
│   └── index.js          # Vercel serverless entry point
├── src/
│   ├── server.js         # Main application
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   └── utils/
├── vercel.json           # Vercel configuration
├── package.json
└── README.md
```

## ⚙️ Vercel Configuration

The `vercel.json` file configures:
- **Build**: Uses `@vercel/node` for Node.js
- **Routes**: All requests go to `src/server.js`
- **Environment**: Sets `NODE_ENV=production`
- **Functions**: 30-second timeout limit

## 🔧 Key Differences from Traditional Deployment

### Serverless Functions
- No persistent server process
- Each request spawns a new function instance
- Cold starts may occur (first request after idle)
- 30-second execution limit

### Database Connections
- Connection pooling is handled automatically
- MongoDB connections are reused when possible
- No need for manual connection management

### Logging
- Console logs appear in Vercel function logs
- File-based logging is not persistent
- Use external logging services for production

## 🌐 API Endpoints

After deployment, your API will be available at:
```
https://your-project.vercel.app/health
https://your-project.vercel.app/api/auth/login
https://your-project.vercel.app/api/users
https://your-project.vercel.app/api/transport-entries
```

## 🔒 Security Considerations

### CORS Configuration
Update `CORS_ORIGIN` in environment variables:
```
CORS_ORIGIN=https://your-frontend.vercel.app,https://your-custom-domain.com
```

### JWT Secret
Use a strong, unique JWT secret:
```bash
# Generate a secure secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Rate Limiting
Vercel automatically provides DDoS protection, but application-level rate limiting is still active.

## 📊 Monitoring & Debugging

### Vercel Dashboard
- **Functions**: View function invocations and performance
- **Analytics**: Request metrics and response times
- **Logs**: Real-time function logs

### Health Check
Monitor your deployment:
```bash
curl https://your-project.vercel.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "Server is running",
  "timestamp": "2025-08-25T11:00:00.000Z",
  "environment": "production",
  "uptime": 0,
  "memory": {
    "used": 25,
    "total": 50
  },
  "database": {
    "status": "connected",
    "readyState": 1
  }
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Check Vercel Dashboard → Settings → Environment Variables
   - Redeploy after adding variables

2. **Database Connection Issues**
   - Verify MongoDB URI is correct
   - Check MongoDB Atlas network access (allow all IPs: 0.0.0.0/0)
   - Ensure database user has proper permissions

3. **CORS Errors**
   - Update `CORS_ORIGIN` environment variable
   - Include your frontend domain

4. **Function Timeout**
   - Optimize database queries
   - Check for infinite loops
   - Monitor function execution time

### Debug Commands
```bash
# View deployment logs
vercel logs your-project-url

# Check function status
vercel inspect your-deployment-url
```

## 🔄 Continuous Deployment

Vercel automatically deploys when you push to your main branch:

```bash
# Make changes
git add .
git commit -m "Update API"
git push origin main
# Vercel automatically deploys
```

## 📈 Performance Optimization

### Cold Start Reduction
- Keep dependencies minimal
- Use connection pooling
- Implement proper caching

### Database Optimization
- Use indexes for frequent queries
- Implement query optimization
- Consider read replicas for heavy read workloads

## 🎯 Production Checklist

- [ ] Environment variables configured in Vercel
- [ ] MongoDB Atlas network access configured
- [ ] CORS origins updated for production domains
- [ ] JWT secret is secure and unique
- [ ] Health check endpoint responding
- [ ] API endpoints working correctly
- [ ] Error handling tested
- [ ] Rate limiting configured
- [ ] Security headers applied
- [ ] Monitoring set up

## 📞 Support

If you encounter issues:
1. Check Vercel function logs
2. Verify environment variables
3. Test API endpoints individually
4. Check MongoDB connection
5. Review CORS configuration

Your backend is now ready for production deployment on Vercel! 🎉