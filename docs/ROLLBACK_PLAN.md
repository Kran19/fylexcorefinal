# Production Emergency Rollback Plan — FYLEX

## 1. Rollback Trigger Criteria

If any critical purchase flow (`/checkout`, `/configure`, `/cart`) encounters a 5xx error during cutover:

1. **Step 1:** Revert Git commit to previous stable release tag (`git checkout HEAD~1`).
2. **Step 2:** Re-enable legacy string array fallback in `next_/lib/utils.js`.
3. **Step 3:** Reload PM2 backend process (`pm2 restart all`).
4. **Step 4:** Verify storefront recovery.
