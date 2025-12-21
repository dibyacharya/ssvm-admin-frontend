# Kubernetes Deployment Configuration

This directory contains Kubernetes manifests for deploying the KIIT LMS Admin Frontend application.

## Files Overview

- **deployment.yaml**: Main application deployment with pod specifications
- **service.yaml**: ClusterIP service for internal communication
- **ingress.yaml**: NGINX Ingress configuration for public access
- **network-policy.yaml**: Network policies for pod-to-pod communication security
- **configmap.yaml**: Non-sensitive configuration data
- **namespace.yaml**: Optional namespace configuration

## Architecture

```
Internet → Azure Front Door → NGINX Ingress → Service (ClusterIP) → Pods
```

### Key Security Features

1. **Network Policies**: Restrict pod-to-pod communication
2. **Internal Services**: Services use ClusterIP (not exposed to public)
3. **Ingress Controller**: Only Ingress exposes public endpoints
4. **Resource Limits**: CPU and memory limits to prevent resource exhaustion
5. **Health Checks**: Liveness and readiness probes for reliability

## Prerequisites

1. AKS cluster with NGINX Ingress Controller installed
2. ACR (Azure Container Registry) with images
3. kubectl configured with cluster access
4. Secrets created for API keys (if needed)

## Deployment Process

The deployment is automated via Azure Pipelines. Manual deployment steps:

### 1. Create ACR Pull Secret

```bash
kubectl create secret docker-registry acr-secret \
  --docker-server=<registry-name>.azurecr.io \
  --docker-username=<acr-username> \
  --docker-password=<acr-password> \
  --namespace=default
```

### 2. Create Application Secrets (Optional)

```bash
kubectl create secret generic kiit-lms-secrets \
  --from-literal=google-api-key='<key>' \
  --from-literal=groq-api-key='<key>' \
  --namespace=default
```

### 3. Deploy Manifests

```bash
# Apply ConfigMap
kubectl apply -f configmap.yaml

# Apply Deployment
kubectl apply -f deployment.yaml

# Apply Service
kubectl apply -f service.yaml

# Apply Network Policy
kubectl apply -f network-policy.yaml

# Apply Ingress (after setting INGRESS_HOST)
kubectl apply -f ingress.yaml
```

## Configuration Variables

The manifests use template variables that are replaced during pipeline execution:

- `{{IMAGE_TAG}}`: Docker image tag
- `{{IMAGE_FULL_PATH}}`: Full image path including registry
- `{{INGRESS_HOST}}`: Domain name for ingress
- `{{ENVIRONMENT}}`: Environment name (dev/uat/prod)
- `{{API_BASE_URL}}`: Backend API base URL

## Service Communication

- **Public Traffic**: Internet → Azure Front Door → NGINX Ingress → Service → Pods
- **Internal Services**: Pods communicate via ClusterIP services (not exposed)
- **Backend API**: Frontend pods call backend APIs via internal service names or external URLs

## Scaling

The deployment is configured with:
- **Replicas**: 2 (can be adjusted)
- **Resource Requests**: 256Mi memory, 250m CPU
- **Resource Limits**: 512Mi memory, 500m CPU

To scale manually:
```bash
kubectl scale deployment kiit-lms-admin-frontend --replicas=3
```

Or use Horizontal Pod Autoscaler:
```bash
kubectl autoscale deployment kiit-lms-admin-frontend --cpu-percent=70 --min=2 --max=10
```

## Monitoring

Check deployment status:
```bash
kubectl get deployment kiit-lms-admin-frontend
kubectl get pods -l app=kiit-lms-admin-frontend
kubectl get service kiit-lms-admin-frontend-service
kubectl get ingress kiit-lms-admin-frontend-ingress
```

View logs:
```bash
kubectl logs -l app=kiit-lms-admin-frontend --tail=100
```

## Troubleshooting

1. **Pods not starting**: Check image pull secrets and image path
2. **Service not accessible**: Verify service selector matches pod labels
3. **Ingress not working**: Check NGINX Ingress Controller and ingress configuration
4. **Network policy blocking**: Review network policy rules

## Security Best Practices

1. ✅ Use Network Policies to restrict traffic
2. ✅ Use ClusterIP for internal services
3. ✅ Use Ingress for public access (not LoadBalancer/NodePort)
4. ✅ Enable TLS/SSL in Ingress
5. ✅ Use secrets for sensitive data
6. ✅ Set resource limits
7. ✅ Enable health checks
8. ✅ Use Azure Front Door for additional security layer

## Production Considerations

1. Use separate namespaces per environment
2. Implement resource quotas
3. Set up monitoring and alerting
4. Configure backup and disaster recovery
5. Use Azure Key Vault for secrets management
6. Enable pod security policies
7. Implement service mesh (Istio/Linkerd) for advanced traffic management

