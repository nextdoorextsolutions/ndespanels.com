# Assets Directory

This directory contains static assets used throughout the application.

## Required Files

### logo-n.png
**Status:** ⚠️ REQUIRED - Please add this file

The teal "N" logo used as a branded fallback when product images fail to load.

**Specifications:**
- Format: PNG with transparency
- Recommended size: 40x40px or larger (will be scaled)
- Color: Teal/cyan (#00d4aa or similar)
- Usage: Fallback for broken product/shingle images

**Used in:**
- `ProductSelector.tsx` - Shingle swatch fallback
- `RichMessage.tsx` - Job card image fallback (future use)

**To add:**
1. Save your teal "N" logo as `logo-n.png` in this directory
2. Remove the `.placeholder` file
3. The image will automatically be used when product images fail to load
