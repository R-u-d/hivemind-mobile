# AWS Infrastructure — HiveMind (Issue #5)

## Overview
AWS infrastructure setup for HiveMind backend using Free Tier resources.

---

## Components

### EC2 (t3.micro)
- Ubuntu instance
- Hosts Django API
- Ports: 22, 8000

### RDS PostgreSQL (db.t3.micro)
- Same VPC as EC2
- Connected successfully
- Migrations executed without errors

### S3 Bucket
- Stores media files:
  - avatars
  - community banners
  - message attachments
- Access via presigned URLs

### IAM User
- Scoped S3 permissions only
- Credentials stored in `.env` (not committed)

---

## API Validation

### Health Check
GET `/api/health/`
Response:
```json
{"status": "ok"}
