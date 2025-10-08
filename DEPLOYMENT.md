# 🚀 Deployment Guide - JAWIR MOTOR Website

## Netlify Deployment

### Prerequisites
1. GitHub account
2. Netlify account (free tier available)
3. Your OpenAI API key

### Step-by-Step Deployment

#### 1. Push to GitHub

First, initialize git and push your code to GitHub:

```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - JAWIR MOTOR website"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/jawir-motor.git
git branch -M main
git push -u origin main
```

**IMPORTANT**: The `.env` file is already in `.gitignore`, so your API key won't be uploaded to GitHub.

#### 2. Deploy on Netlify

1. **Go to Netlify**: https://app.netlify.com/
2. **Sign up/Login** with your GitHub account
3. **Click "Add new site" → "Import an existing project"**
4. **Choose GitHub** and select your `jawir-motor` repository
5. **Build settings** (should auto-detect):
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

6. **Click "Deploy site"**

#### 3. Add Environment Variables

After deployment, you need to add your OpenAI API key:

1. Go to **Site settings → Environment variables**
2. Click **Add a variable**
3. Add:
   - **Key**: `VITE_OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (sk-proj-...)
4. Click **Save**
5. **Redeploy** your site (Deploys → Trigger deploy → Deploy site)

#### 4. Connect Your Custom Domain

1. Go to **Domain management → Add custom domain**
2. Enter your domain (e.g., `jawirmotor.com`)
3. Follow instructions to update your domain's DNS settings
4. Netlify will automatically provision SSL certificate (HTTPS)

**DNS Settings** (add these in your domain registrar):
```
Type: A
Name: @
Value: (Netlify will provide the IP)

Type: CNAME
Name: www
Value: your-site-name.netlify.app
```

Wait 24-48 hours for DNS propagation.

#### 5. Verify Deployment

After deployment completes:
1. Visit your Netlify URL (e.g., `your-site-name.netlify.app`)
2. Test the chat functionality
3. Make sure AI responses work correctly

---

## 🔧 Updating Your Site

Whenever you make changes:

```bash
git add .
git commit -m "Your update message"
git push
```

Netlify will automatically rebuild and redeploy your site!

---

## 🛠️ Troubleshooting

### Chat not working after deployment?
- Check if environment variable `VITE_OPENAI_API_KEY` is set correctly
- Check Netlify Functions logs in the dashboard
- Make sure you have OpenAI credits

### Build failed?
- Check the build logs in Netlify dashboard
- Make sure all dependencies are in `package.json`

### Domain not working?
- DNS changes can take 24-48 hours
- Verify DNS settings with your domain registrar

---

## 📊 Monitor Usage

- **OpenAI costs**: https://platform.openai.com/usage
- **Netlify bandwidth**: Check your Netlify dashboard

---

## 🎉 Your Site is Live!

Once deployed, your customers can access the website at:
- **Netlify URL**: `https://your-site-name.netlify.app`
- **Custom Domain**: `https://jawirmotor.com` (after DNS setup)

The AI chatbot will help customers diagnose motorcycle issues and recommend visiting JAWIR MOTOR! 🏍️
