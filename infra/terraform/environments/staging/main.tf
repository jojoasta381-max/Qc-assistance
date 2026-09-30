module "networking" {
  source = "../../modules/networking"

  project_name   = var.project_name
  environment    = var.environment
  container_port = var.container_port

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

module "alb" {
  source = "../../modules/alb"

  project_name          = var.project_name
  environment           = var.environment
  vpc_id                = module.networking.vpc_id
  subnet_ids            = module.networking.subnet_ids
  alb_security_group_id = module.networking.alb_security_group_id
  container_port        = var.container_port
  health_check_path     = "/api/health"

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

module "ecs" {
  source = "../../modules/ecs"

  project_name          = var.project_name
  environment           = var.environment
  aws_region            = var.aws_region
  cpu                   = var.cpu
  memory                = var.memory
  desired_count         = var.desired_count
  container_port        = var.container_port
  repository_url        = var.repository_url
  image_tag             = var.image_tag
  s3_bucket_name        = var.s3_bucket_name
  secret_arn            = var.secret_arn
  execution_role_arn    = var.execution_role_arn
  task_role_arn         = var.task_role_arn
  log_group_name        = var.log_group_name
  subnet_ids            = module.networking.subnet_ids
  ecs_security_group_id = module.networking.ecs_security_group_id
  target_group_arn      = module.alb.target_group_arn

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
