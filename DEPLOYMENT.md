# Deployment Guide for Render

## Prerequisites
1. GitHub repository with your code
2. Render account (free tier available)

## Deployment Steps

### Option 1: Using render.yaml (Recommended)
1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New" → "Blueprint"
4. Connect your GitHub repository
5. Render will automatically detect the `render.yaml` file and create both services

### Option 2: Manual Setup

#### Backend Deployment
1. Go to Render Dashboard
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: wastewise-backend
   - **Root Directory**: backend
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `NODE_ENV`: production
     - `MONGODB_URI`: your MongoDB connection string
     - `JWT_SECRET`: generate a secure secret

#### Frontend Deployment
1. Click "New" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   - **Name**: wastewise-frontend
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: dist
   - **Environment Variables**:
     - `VITE_API_URL`: https://your-backend-url.onrender.com

## Environment Variables

### Backend (.env)
```
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
```

### Frontend
```
VITE_API_URL=https://your-backend-url.onrender.com
```

## Important Notes

1. **Free Tier Limitations**: 
   - Services sleep after 15 minutes of inactivity
   - 750 hours/month limit
   - Cold starts may take 30+ seconds

2. **Database**: 
   - Use MongoDB Atlas (free tier available)
   - Update MONGODB_URI in backend environment variables

3. **File Uploads**: 
   - Render's filesystem is ephemeral
   - Consider using cloud storage (AWS S3, Cloudinary) for production

4. **Custom Domain**: 
   - Available on paid plans
   - Configure in service settings

## Troubleshooting

- Check build logs in Render dashboard
- Ensure all environment variables are set
- Verify MongoDB connection string
- Check that frontend API URL matches backend URL