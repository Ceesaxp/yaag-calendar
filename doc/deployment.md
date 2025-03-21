# YAAG Calendar Deployment Guide

## GitHub Actions Deployment

This project includes a GitHub Actions workflow that automatically deploys the application when a new release is published or when manually triggered.

### Setup Instructions

1. **Generate an SSH Key Pair**
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f github-actions-deploy
   ```
   This creates two files:
   - `github-actions-deploy` (private key)
   - `github-actions-deploy.pub` (public key)

2. **Add the Public Key to Your Server**
   Copy the public key to your server's `~/.ssh/authorized_keys` file:
   ```bash
   cat github-actions-deploy.pub >> ~/.ssh/authorized_keys
   ```

3. **Get Known Hosts**
   To prevent SSH host verification issues, obtain the SSH known hosts entry:
   ```bash
   ssh-keyscan -t rsa,ecdsa,ed25519 your-server-hostname.com
   ```

4. **Configure GitHub Secrets**
   In your GitHub repository, go to Settings → Secrets and Variables → Actions, and add the following secrets:

   | Secret Name | Description |
   |-------------|-------------|
   | `SSH_PRIVATE_KEY` | The entire contents of the `github-actions-deploy` private key file |
   | `SSH_KNOWN_HOSTS` | The output from the ssh-keyscan command |
   | `SSH_HOST` | Your server's hostname or IP address |
   | `SSH_USERNAME` | The SSH username to connect with |
   | `SSH_PORT` | (Optional) The SSH port (defaults to 22) |
   | `REMOTE_PATH` | The absolute path on your server where the files should be deployed (e.g., `/var/www/yaag-calendar`) |

### Manual Deployment

You can manually trigger a deployment by:
1. Go to the Actions tab in your GitHub repository
2. Select the "Deploy to Server" workflow
3. Click "Run workflow" 
4. Choose the environment (production or staging)
5. Click "Run workflow"

### Automatic Deployment

The workflow automatically runs whenever a new GitHub release is published. To create a release:
1. Go to the Releases tab in your GitHub repository
2. Click "Create a new release"
3. Fill in the version tag, title, and description
4. Click "Publish release"

## Server Requirements

- SSH access with the configured username and key
- `rsync` installed on both GitHub Actions runner (pre-installed) and your server
- Appropriate permissions for the destination directory on your server