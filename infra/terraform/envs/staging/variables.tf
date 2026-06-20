variable "project_name" {
  type    = string
  default = "gpa-management"
}

variable "cluster_name" {
  type    = string
  default = "gpa-management"
}

variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

variable "domain_name" {
  type        = string
  description = "Root domain, for example example.com"
}

variable "hosted_zone_id" {
  type        = string
  description = "Route 53 hosted zone ID for domain_name"
}

variable "api_origin_domain_name" {
  type        = string
  description = "ALB DNS name created by Kubernetes Gateway API, without https://"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "azs" {
  type    = list(string)
  default = ["ap-southeast-1a", "ap-southeast-1b"]
}
