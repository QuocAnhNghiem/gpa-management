output "frontend_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

output "frontend_distribution_domain_name" {
  value = aws_cloudfront_distribution.frontend.domain_name
}

output "frontend_distribution_hosted_zone_id" {
  value = aws_cloudfront_distribution.frontend.hosted_zone_id
}

output "api_distribution_id" {
  value = aws_cloudfront_distribution.api.id
}

output "api_distribution_domain_name" {
  value = aws_cloudfront_distribution.api.domain_name
}

output "api_distribution_hosted_zone_id" {
  value = aws_cloudfront_distribution.api.hosted_zone_id
}
