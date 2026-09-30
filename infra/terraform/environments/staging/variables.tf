variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "ap-south-1"
}

variable "project_name" {
  type        = string
  description = "Project name"
  default     = "spanqc"
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "staging"
}

variable "image_tag" {
  type        = string
  description = "Docker image tag in ECR"
  default     = "f5a2dd1"
}

variable "container_port" {
  type        = number
  description = "Port exposed by container"
  default     = 3000
}

variable "cpu" {
  type        = number
  description = "Fargate CPU units"
  default     = 512
}

variable "memory" {
  type        = number
  description = "Fargate Memory units"
  default     = 1024
}

variable "desired_count" {
  type        = number
  description = "Desired number of running ECS tasks"
  default     = 1
}

variable "s3_bucket_name" {
  type        = string
  description = "S3 bucket name for documents"
  default     = "spanqc-staging-documents-905418293374"
}

variable "secret_arn" {
  type        = string
  description = "AWS Secrets Manager secret ARN"
  default     = "arn:aws:secretsmanager:ap-south-1:905418293374:secret:spanqc/staging/app-secrets-R4wtvP"
}

variable "execution_role_arn" {
  type        = string
  description = "ECS Task Execution Role ARN"
  default     = "arn:aws:iam::905418293374:role/spanqc-staging-ecs-execution-role"
}

variable "task_role_arn" {
  type        = string
  description = "ECS Task Role ARN"
  default     = "arn:aws:iam::905418293374:role/spanqc-staging-ecs-task-role"
}

variable "log_group_name" {
  type        = string
  description = "CloudWatch Log Group"
  default     = "/ecs/spanqc-staging"
}

variable "repository_url" {
  type        = string
  description = "ECR Repository URL"
  default     = "905418293374.dkr.ecr.ap-south-1.amazonaws.com/spanqc-staging"
}
