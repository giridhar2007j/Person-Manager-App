# Git Setup Instructions

## Step 1: Install Git
Since your system requires admin privileges for installation, please:

1. Download Git from: https://git-scm.com/download/win
2. Run the installer with administrator privileges
3. Accept all default settings during installation

## Step 2: Configure Git (after installation)
After Git is installed, open PowerShell and run:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 3: Create GitHub Repository
1. Go to https://github.com/new
2. Create a new repository named `gov-job-portal`
3. DO NOT initialize with README, .gitignore, or license
4. Click "Create repository"

## Step 4: Initialize Local Repository (run in project folder)
After Git is installed, run these commands in your project directory:

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gov-job-portal.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 5: Authenticate with GitHub
When you run `git push`, you'll be prompted to authenticate:
- You can use a Personal Access Token (recommended)
- Or authenticate through the browser

### Create a Personal Access Token:
1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Set expiration to 90 days or more
4. Check: `repo` (Full control of private repositories)
5. Generate and copy the token
6. Use this token when Git asks for password

## Files Created in Project:
- `.git/` - Git repository folder (hidden)
- `.gitignore` - Files to exclude from version control

## Verify Setup:
After push is complete, verify at: https://github.com/YOUR_USERNAME/gov-job-portal
