variable "project_name" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Deployment environment"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
}

variable "cpu" {
  type        = number
  description = "Task CPU units (e.g. 512 = 0.5 vCPU)"
  default     = 512
}

variable "memory" {
  type        = number
  description = "Task Memory (e.g. 1024 = 1GB)"
  default     = 1024
}

variable "execution_role_arn" {
  type        = string
  description = "ECS Task Execution Role ARN"
}

variable "task_role_arn" {
  type        = string
  description = "ECS Task Role ARN"
}

variable "repository_url" {
  type        = string
  description = "ECR Repository URL"
}

variable "image_tag" {
  type        = string
  description = "Container image tag to deploy"
}

variable "container_port" {
  type        = number
  description = "Port exposed by container"
  default     = 3000
}

variable "s3_bucket_name" {
  type        = string
  description = "S3 bucket for document storage"
}

variable "secret_arn" {
  type        = string
  description = "AWS Secrets Manager secret ARN"
}

variable "log_group_name" {
  type        = string
  description = "CloudWatch log group name"
}

variable "desired_count" {
  type        = number
  description = "Number of ECS tasks to run"
  default     = 1
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet IDs for ECS tasks"
}

variable "ecs_security_group_id" {
  type        = string
  description = "Security group ID for ECS tasks"
}

variable "target_group_arn" {
  type        = string
  description = "ALB target group ARN"
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
