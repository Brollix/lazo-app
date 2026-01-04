# CloudFront Behaviors Configuration

| Precedence | Path pattern | Origin or origin group                                    | Viewer protocol policy | Cache policy name       | Origin request policy name | Response headers policy name |
| ---------- | ------------ | --------------------------------------------------------- | ---------------------- | ----------------------- | -------------------------- | ---------------------------- |
| 0          | `/api/*`     | Backend-API-EC2                                           | Redirect HTTP to HTTPS | Managed-CachingDisabled | Managed-AllViewer          | -                            |
| 1          | `/uploads/*` | lazo-audio-uploads.s3.sa-east-1.amazonaws.com-mjz2defctcf | Redirect HTTP to HTTPS | Managed-CachingDisabled | Managed-CORS-CustomOrigin  | -                            |
| 2          | Default (\*) | Backend-API-EC2                                           | Redirect HTTP to HTTPS | Managed-CachingDisabled | Managed-AllViewer          | Managed-SimpleCORS           |
