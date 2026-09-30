output "alb_dns_name" {
  value       = module.alb.alb_dns_name
  description = "Public DNS name of the ALB"
}

output "staging_url" {
  value       = "http://${module.alb.alb_dns_name}"
  description = "Direct HTTP endpoint for AWS staging testing"
}

output "ecs_cluster_name" {
  value       = module.ecs.cluster_name
  description = "ECS cluster name"
}

output "ecs_service_name" {
  value       = module.ecs.service_name
  description = "ECS service name"
}

output "s3_bucket" {
  value       = var.s3_bucket_name
  description = "S3 bucket for document storage"
}
