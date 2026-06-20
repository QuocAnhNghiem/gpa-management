resource "aws_route53_record" "frontend" {
  zone_id = var.hosted_zone_id
  name    = "app.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.frontend_distribution_domain
    zone_id                = var.frontend_distribution_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api" {
  zone_id = var.hosted_zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.api_distribution_domain
    zone_id                = var.api_distribution_zone_id
    evaluate_target_health = false
  }
}
