# LinkedIn OAuth Fix for Issue #9

## Problem
Users were experiencing "Unknown authentication scheme" errors when trying to authenticate with LinkedIn using hello.js. This was due to outdated API endpoints and authentication parameters.

## Root Cause
The LinkedIn module was using deprecated v1 API endpoints and OAuth URLs that are no longer supported by LinkedIn's current API.

## Solution
Updated the LinkedIn module to use LinkedIn's current v2 API with proper authentication scheme:

### Changes Made

1. **Updated OAuth Endpoints**
   - Changed from `https://www.linkedin.com/uas/oauth2/authorization` to `https://www.linkedin.com/oauth/v2/authorization`
   - Changed from `https://www.linkedin.com/uas/oauth2/accessToken` to `https://www.linkedin.com/oauth/v2/accessToken`

2. **Updated API Base URL**
   - Changed from `https://api.linkedin.com/v1/` to `https://api.linkedin.com/v2/`

3. **Updated Scope Names**
   - Changed `r_basicprofile` to `r_liteprofile` (LinkedIn's current basic profile scope)
   - Changed `w_share` to `w_member_social` (LinkedIn's current sharing scope)

4. **Added Required Headers**
   - Added `LinkedIn-Version: 202310` header for API versioning
   - Added `X-Restli-Protocol-Version: 2.0.0` header for REST protocol

5. **Updated Response Handling**
   - Updated `formatUser` function to handle LinkedIn v2 API response format
   - Added support for localized names and new profile picture structure

6. **Improved Error Handling**
   - Added specific handling for "Unknown authentication scheme" error
   - Better error messages to guide users

## How to Use

### 1. Register Your App
Make sure your LinkedIn application is properly registered at:
- LinkedIn Developer Portal: https://www.linkedin.com/developers/
- OAuth Proxy (if using): https://auth-server.herokuapp.com/

### 2. Use Updated Scopes
```javascript
hello.init({
    linkedin: 'your-linkedin-client-id'
}, {
    scope: ['basic', 'email'],  // Uses r_liteprofile and r_emailaddress
    redirect_uri: 'your-redirect-uri',
    oauth_proxy: 'https://auth-server.herokuapp.com/proxy'
});
```

### 3. Login and Get Profile
```javascript
hello('linkedin').login().then(function(auth) {
    console.log('Logged in!', auth);
    return hello('linkedin').api('me');
}).then(function(profile) {
    console.log('Profile:', profile);
}).catch(function(error) {
    console.error('Error:', error);
});
```

## Testing
Use the provided demo file `demos/linkedin_fixed.html` to test the implementation.

## Compatibility
- Works with LinkedIn API v2
- Backward compatible with existing hello.js applications
- Requires OAuth proxy for full functionality

## Files Modified
- `src/modules/linkedin.js` - Main LinkedIn module
- `demos/linkedin_fixed.html` - Demo implementation
- `test_linkedin_fix.html` - Test file

## Commits
1. **Fix LinkedIn OAuth endpoints and API version** - Updated core API endpoints and scopes
2. **Add LinkedIn v2 API headers and improved error handling** - Added headers and better error handling

This fix resolves the "Unknown authentication scheme" error and ensures LinkedIn OAuth works with current API standards.