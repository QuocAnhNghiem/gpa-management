resource "aws_cloudwatch_log_group" "app" {
  name              = "/${var.project_name}/app"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "waf" {
  name              = "/${var.project_name}/waf"
  retention_in_days = 14
}
