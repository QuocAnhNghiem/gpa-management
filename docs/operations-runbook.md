# Operations Runbook

This runbook documents common operational tasks for the AWS/EKS deployment.

## Health Checks

Check production API:

```bash
curl -s https://api.nghiemquocanh.me/healthz
curl -s https://api.nghiemquocanh.me/readyz
```

Expected:

```json
{"success":true,"status":"ok"}
```

Check Kubernetes workloads:

```bash
kubectl get pods -n gpa-prod
kubectl get deploy -n gpa-prod
kubectl get hpa -n gpa-prod
kubectl get gateway,httproute -n gpa-prod
```

## Rollout History

```bash
ENVIRONMENT=prod bash scripts/deploy/rollout-history.sh
```

This shows:

- Current backend and worker images.
- Rollout history.
- Current pod status.

## Rollback

Production rollback is guarded.

Rollback to previous Kubernetes revision:

```bash
ENVIRONMENT=prod \
CONFIRM_PRODUCTION_ROLLBACK=I_UNDERSTAND \
bash scripts/deploy/rollback-k8s.sh
```

Rollback to a specific image tag:

```bash
ENVIRONMENT=prod \
CONFIRM_PRODUCTION_ROLLBACK=I_UNDERSTAND \
ECR_REPO=<account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/gpa-management-backend \
IMAGE_TAG=<old-image-tag> \
bash scripts/deploy/rollback-k8s.sh
```

The rollback script:

- Prints images before rollback.
- Runs `kubectl rollout undo` or sets an explicit image.
- Waits for backend and worker rollout.
- Prints images after rollback.
- Runs smoke test unless skipped.

## Cost Inventory

Read-only cost-sensitive resource inventory:

```bash
AWS_REGION=ap-southeast-1 \
CLUSTER_NAME=gpa-management \
PROJECT_FILTER=gpa-management \
bash scripts/deploy/aws-cost-inventory.sh
```

It lists:

- EKS cluster and node groups.
- EC2 worker nodes and Jenkins EC2.
- NAT Gateway.
- ALBs.
- CloudFront distributions.
- CloudWatch log groups.
- ECR repositories.
- S3 buckets.

## Main Cost Drivers

| Resource | Why it costs |
| --- | --- |
| EKS control plane | Charged hourly while cluster exists |
| EKS worker nodes | EC2 instances running for Kubernetes |
| Jenkins EC2 | Separate CI/CD instance |
| NAT Gateway | Hourly charge plus data processing |
| ALB | Hourly charge plus LCU usage |
| CloudWatch | Logs ingestion, metrics, retention |
| CloudFront/S3 | Requests, data transfer, storage |

## Safe Cost Reduction

Lowest-risk action when not actively building:

```text
Stop Jenkins EC2 when not using Jenkins.
```

Higher-impact cleanup options:

- Scale down or delete staging workloads.
- Delete staging ALB if no longer needed.
- Delete EKS cluster after demo is complete.
- Delete NAT Gateway after cluster cleanup.

Any destructive cleanup should be reviewed carefully because it can cause downtime or data loss.

