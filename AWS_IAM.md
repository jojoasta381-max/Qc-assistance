# AWS IAM Least-Privilege Architecture
**Project:** SpanQC / Wiring Diagram QC Assistant  
**AWS Account ID:** `905418293374`  
**AWS Region:** `ap-south-1` (Mumbai)  

---

## 1. IAM Principles & Separation of Concerns

Under no circumstances is `AdministratorAccess` granted to runtime compute. The ECS Fargate service strictly decouples:

1. **ECS Task Execution Role (`spanqc-staging-ecs-execution-role`):** Used by the AWS ECS Agent to pull images from ECR, create CloudWatch log streams, and resolve secrets from Secrets Manager at task launch time.
2. **ECS Task Role (`spanqc-staging-ecs-task-role`):** Assumed by the containerized Node.js application process itself at runtime to access AWS services (specifically private S3 document storage).

---

## 2. ECS Task Execution Role

- **Role Name:** `spanqc-staging-ecs-execution-role`
- **Role ARN:** `arn:aws:iam::905418293374:role/spanqc-staging-ecs-execution-role`
- **Trust Relationship:** `ecs-tasks.amazonaws.com`

### Inline Policy: `SpanQcExecutionPolicy`
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EcrPullAccess",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchLogAccess",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:ap-south-1:905418293374:log-group:/ecs/spanqc-staging:*"
    },
    {
      "Sid": "SecretsManagerAccess",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:ap-south-1:905418293374:secret:spanqc/staging/app-secrets*"
    }
  ]
}
```

---

## 3. ECS Task Role

- **Role Name:** `spanqc-staging-ecs-task-role`
- **Role ARN:** `arn:aws:iam::905418293374:role/spanqc-staging-ecs-task-role`
- **Trust Relationship:** `ecs-tasks.amazonaws.com`

### Inline Policy: `SpanQcTaskStoragePolicy`
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ScopedS3ObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::spanqc-staging-documents-905418293374/*"
    },
    {
      "Sid": "ScopedS3BucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::spanqc-staging-documents-905418293374"
    }
  ]
}
```

---

## 4. Security Verification
- [x] Zero administrative policies attached to runtime roles.
- [x] S3 actions strictly restricted to bucket `spanqc-staging-documents-905418293374`.
- [x] Secrets Manager access strictly restricted to `spanqc/staging/app-secrets*`.
- [x] CloudWatch log permissions strictly restricted to log group `/ecs/spanqc-staging`.
