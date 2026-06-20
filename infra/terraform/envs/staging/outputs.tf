output "backend_ecr_repository_url" {
  value = module.ecr.backend_repository_url
}

output "frontend_bucket_name" {
  value = module.s3.frontend_bucket_name
}

output "upload_bucket_name" {
  value = module.s3.upload_bucket_name
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "frontend_cloudfront_domain" {
  value = module.cloudfront.frontend_distribution_domain_name
}

output "api_cloudfront_domain" {
  value = module.cloudfront.api_distribution_domain_name
}
