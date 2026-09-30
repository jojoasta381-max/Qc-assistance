variable "project_name" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Deployment environment"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet IDs for the ALB"
}

variable "alb_security_group_id" {
  type        = string
  description = "Security group ID for the ALB"
}

variable "container_port" {
  type        = number
  description = "Target group port"
  default     = 3000
}

variable "health_check_path" {
  type        = string
  description = "Path for ALB health checks"
  default     = "/api/health"
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
