# Instagram Graph API Setup

## Overview

This document outlines the required setup steps for Instagram Graph API integration for displaying social proof on storefronts.

## Instagram Graph API vs. Basic Display API

> **Important**: Instagram's Basic Display API is being deprecated. New integrations should use the **Instagram Graph API** for business accounts.

## Requirements

### 1. Facebook Business Account
- Create a Facebook Business account at business.facebook.com
- Verify your business (may require documentation)

### 2. Facebook App Setup
1. Create a new app at developers.facebook.com
2. Add **Instagram** product to your app
3. Configure **Instagram Graph API** permissions

### 3. Required Permissions
- `instagram_basic` - Access Instagram profile info
- `instagram_content_publish` - Publish content (for creators)
- `instagram_manage_comments` - Moderate comments
- `pages_read_engagement` - Read page metrics
- `instagram_manage_insights` - Access insights data

### 4. App Review Timeline

**Standard Review**: 5-7 business days

**Business Verification**: May add additional 1-2 weeks if not already verified

**Total Timeline**: Plan for 2-3 weeks minimum

### 5. App Review Requirements

For `instagram_basic` and content permissions:
- Detailed privacy policy URL
- Video demo of the integration
- Test user credentials
- Clear explanation of use case

### 6. Setup Steps

1. Create Facebook App (Business or Consumer type)
2. Add Instagram product
3. Configure OAuth redirect URIs
4. Submit for App Review
5. Get business verification approved
6. Generate User Access Token
7. Get Instagram Business Account ID
8. Store credentials in SocialConnection table

## Webhook Events (Future)

Instagram Graph API supports webhooks for:
- New comments
- New followers
- Media comments
- Mentions

These can be integrated into the existing webhook handling system.

## Security Considerations

- Store access tokens encrypted (AES-256 helper in `/src/lib/encryption.ts`)
- Implement token refresh handling
- Set token expiration to reasonable intervals
- Monitor for token invalidation

## TODO

- [ ] Implement Instagram OAuth flow (similar to TikTok)
- [ ] Add Instagram webhook endpoint
- [ ] Create Instagram connection management UI
- [ ] Add Instagram stats display to storefront

## Resources

- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-api)
- [App Review Guidelines](https://developers.facebook.com/docs/app-review)
- [Business Verification](https://www.facebook.com/business/help/2593585817121)