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
  description = "VPC ID (optional, defaults to default VPC)"
  default     = ""
}

variable "container_port" {
  type        = number
  description = "Application container port"
  default     = 3000
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
