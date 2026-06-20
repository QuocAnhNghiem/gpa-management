variable "project_name" {
  type = string
}

variable "domain_name" {
  type = string
}

variable "frontend_bucket_name" {
  type = string
}

variable "frontend_bucket_regional_domain_name" {
  type = string
}

variable "api_origin_domain_name" {
  type = string
}

variable "acm_certificate_arn" {
  type = string
}

variable "waf_web_acl_arn" {
  type = string
}
