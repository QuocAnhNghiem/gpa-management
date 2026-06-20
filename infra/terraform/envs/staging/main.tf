terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "aws" {
  alias  = "use1"
  region = "us-east-1"
}

module "network" {
  source = "../../modules/network"

  project_name = var.project_name
  cluster_name = var.cluster_name
  vpc_cidr     = var.vpc_cidr
  azs          = var.azs
}

module "ecr" {
  source       = "../../modules/ecr"
  project_name = var.project_name
}

module "s3" {
  source       = "../../modules/s3"
  project_name = var.project_name
  domain_name  = var.domain_name
}

module "waf" {
  source       = "../../modules/waf"
  project_name = var.project_name

  providers = {
    aws = aws.use1
  }
}

module "acm_cloudfront" {
  source         = "../../modules/acm"
  domain_name    = var.domain_name
  hosted_zone_id = var.hosted_zone_id

  providers = {
    aws = aws.use1
  }
}

module "eks" {
  source = "../../modules/eks"

  project_name       = var.project_name
  cluster_name       = var.cluster_name
  private_subnet_ids = module.network.private_subnet_ids
}

module "iam" {
  source = "../../modules/iam"

  project_name         = var.project_name
  cluster_name         = module.eks.cluster_name
  namespace            = "gpa-staging"
  service_account_name = "gpa-backend-sa"
  upload_bucket_name   = module.s3.upload_bucket_name
}

module "cloudfront" {
  source = "../../modules/cloudfront"

  project_name                         = var.project_name
  domain_name                          = var.domain_name
  frontend_bucket_name                 = module.s3.frontend_bucket_name
  frontend_bucket_regional_domain_name = module.s3.frontend_bucket_regional_domain_name
  acm_certificate_arn                  = module.acm_cloudfront.certificate_arn
  waf_web_acl_arn                      = module.waf.web_acl_arn
  api_origin_domain_name               = var.api_origin_domain_name
}

module "route53" {
  source = "../../modules/route53"

  domain_name                   = var.domain_name
  hosted_zone_id                = var.hosted_zone_id
  frontend_distribution_domain  = module.cloudfront.frontend_distribution_domain_name
  frontend_distribution_zone_id = module.cloudfront.frontend_distribution_hosted_zone_id
  api_distribution_domain       = module.cloudfront.api_distribution_domain_name
  api_distribution_zone_id      = module.cloudfront.api_distribution_hosted_zone_id
}

module "cloudwatch" {
  source       = "../../modules/cloudwatch"
  project_name = var.project_name
}
