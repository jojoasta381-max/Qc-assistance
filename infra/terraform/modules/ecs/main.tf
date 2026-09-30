resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cluster"
  })
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project_name}-${var.environment}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = tostring(var.cpu)
  memory                   = tostring(var.memory)
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = "spanqc-app"
      image     = "${var.repository_url}:${var.image_tag}"
      essential = true
      portMappings = [
        {
          containerPort = var.container_port
          hostPort      = var.container_port
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "APP_MODE", value = "PRODUCTION" },
        { name = "PORT", value = tostring(var.container_port) },
        { name = "HOSTNAME", value = "0.0.0.0" },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "AWS_S3_BUCKET", value = var.s3_bucket_name },
        { name = "STORAGE_PROVIDER", value = "s3" },
        { name = "BILLING_STATUS", value = "NOT_LIVE" }
      ]
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "${var.secret_arn}:DATABASE_URL::"
        },
        {
          name      = "DIRECT_URL"
          valueFrom = "${var.secret_arn}:DIRECT_URL::"
        },
        {
          name      = "AUTH_SECRET"
          valueFrom = "${var.secret_arn}:AUTH_SECRET::"
        },
        {
          name      = "RAZORPAY_KEY_ID"
          valueFrom = "${var.secret_arn}:RAZORPAY_KEY_ID::"
        },
        {
          name      = "RAZORPAY_KEY_SECRET"
          valueFrom = "${var.secret_arn}:RAZORPAY_KEY_SECRET::"
        },
        {
          name      = "RAZORPAY_WEBHOOK_SECRET"
          valueFrom = "${var.secret_arn}:RAZORPAY_WEBHOOK_SECRET::"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = var.log_group_name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://127.0.0.1:3000/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 15
      }
    }
  ])

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-task"
  })
}

resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-${var.environment}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "spanqc-app"
    container_port   = var.container_port
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-service"
  })
}
