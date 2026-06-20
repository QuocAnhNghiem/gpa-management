output "backend_repository_name" {
  value = aws_ecr_repository.backend.name
}

output "backend_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}
