---
title: Kubernetes Part Two
description: Diving into the world of k8s once again, again
date: 2025-05-24
tags: ["k8s","infra"]
---

It's been a while since I've updated this blog, but I've recently been working on my cluster again and figured I'd put together an update on where I'm at now. I've been trying to keep better notes as I work on projects so I can refer back when needed and see how things evolve over time.

At the end of my last post, I had the cluster deployed, and Flux deployed on it to handle Gitops-style deployments. Some of the major changes I've implemented since then:
- Migrated Terraform state to a remote backend (Terraform cloud)
- Moved Flux config into Terraform
- Added monitoring with Prometheus and Grafana

## Terraform Everything
One of my first changes was to migrate my Terraform state to a remote backend (Terraform cloud). The remote Terraform state is nice and convenient, since I'm not tied to any local state files stored on a single machine. I can run Terraform commands locally if I need to, or just push to my repo from anywhere that has access to the Github. This was pretty simple, especially for Terraform Cloud, where all I needed to do was add a cloud block to my config, then re-run `terraform init`.

```hcl
terraform {
  ...
  cloud {
    organization = "venatio-infra"
    workspaces {
      name = "hetzner-infra"
    }
  }
}
```

I wanted everything on this cluster to be declarative, but I had previously installed Flux using their CLI tool. Flux should be just another component of the cluster that gets deployed on creation. I was able to add Flux configuration to Terraform by making use of their provider. I recreated the configuration installed with my original `flux bootstrap` command with the following Terraform code.

```hcl
# Add the Kubernetes provider configuration
provider "kubernetes" {
  alias = "cluster"
  host                   = yamldecode(module.kube-hetzner.kubeconfig)["clusters"][0]["cluster"]["server"]
  client_certificate     = base64decode(yamldecode(module.kube-hetzner.kubeconfig)["users"][0]["user"]["client-certificate-data"])
  client_key             = base64decode(yamldecode(module.kube-hetzner.kubeconfig)["users"][0]["user"]["client-key-data"])
  cluster_ca_certificate = base64decode(yamldecode(module.kube-hetzner.kubeconfig)["clusters"][0]["cluster"]["certificate-authority-data"])
}

# Add the Flux provider configuration
provider "flux" {
  alias = "cluster"
  kubernetes = {
    # Use the kubeconfig contents directly, not as a file path
    host                   = yamldecode(module.kube-hetzner.kubeconfig)["clusters"][0]["cluster"]["server"]
    client_certificate     = base64decode(yamldecode(module.kube-hetzner.kubeconfig)["users"][0]["user"]["client-certificate-data"])
    client_key             = base64decode(yamldecode(module.kube-hetzner.kubeconfig)["users"][0]["user"]["client-key-data"])
    cluster_ca_certificate = base64decode(yamldecode(module.kube-hetzner.kubeconfig)["clusters"][0]["cluster"]["certificate-authority-data"])
  }
  git = {
    url = "https://github.com/${var.github_user}/infrastructure.git"
    http = {
      username = var.github_user  # Can be any string when using PAT
      password = var.github_token
    }
  }
}

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = ">= 1.49.1"
    }
    flux = {
      source  = "fluxcd/flux"
      version = ">= 1.2"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.23.0"
    }
  }
  cloud {
    organization = "venatio-infra"
    workspaces {
      name = "hetzner-infra"
    }
  }
}

output "kubeconfig" {
  value     = module.kube-hetzner.kubeconfig
  sensitive = true
}

# Add new variables for GitHub authentication
variable "github_user" {
  type        = string
  description = "GitHub username"
  sensitive   = false
}

variable "github_token" {
  type        = string
  description = "GitHub Personal Access Token"
  sensitive   = true
}

# Add the Flux bootstrap configuration
resource "flux_bootstrap_git" "this" {
  provider = flux.cluster
  depends_on = [module.kube-hetzner]

  path       = "flux"

  components_extra = [
    "image-reflector-controller",
    "image-automation-controller"
  ]

  namespace = "flux-system"
}
```

I imported my existing Flux resources using `terraform import flux_bootstrap_git.this flux-system` to reconcile the state. I had to define environment variables for my Github username and token to run the import, even though subsequent runs will use variables defined on Terraform Cloud.

Flux requires access to the cluster, but the `kubeconfig` file needs to be generated before Flux can use it and so I ensured this by adding `depends_on` where necessary. And then the Flux configuration makes use of `yamldecode` to parse fields from this file.

## Metrics

One major feature I realize I was missing was observability into my cluster. Sure I could use `kubectl` but I'm a sucker for a nice graph, and I wanted to be able to determine the cluster's health at a glance. This was where the [KH Assistant](https://chatgpt.com/g/g-67df95cd1e0c8191baedfa3179061581-kh-assistant) came in very handy. This is a custom GPT created by the folks who built the [kube-hetzner](https://github.com/kube-hetzner/terraform-hcloud-kube-hetzner) project this whole cluster is built on.

I made use of [kube-prometheus-stack](https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack) to set up Prometheus and Grafana, making sure to enable the default dashboards.

```yaml
values:
  grafana:
    defaultDashboardsEnabled: true
```

And then Loki and Promtail were installed using [loki-stack](https://github.com/grafana/helm-charts/tree/main/charts/loki-stack) from Grafana.

Once those were set up, I wanted to be able to see basic visitor metrics via Traefik access logs. In order to configure Traefik to send these logs, I needed to provide a custom `traefik_values` variable in my Terraform config, since Traefik is one of the basic components set up by the `kube-hetzner` project. This overwrites the configuration yaml for Traefik, so I pulled its current config and then added arguments to enable logging, and ended up with this in my Terraform file:

```hcl
traefik_values = <<-EOT
image:
  tag: ""
deployment:
  replicas: 3
globalArguments: []
service:
  enabled: true
  type: LoadBalancer
  annotations:
    load-balancer.hetzner.cloud/name: "k3s-traefik"
    load-balancer.hetzner.cloud/use-private-ip: "true"
    load-balancer.hetzner.cloud/disable-private-ingress: "true"
    load-balancer.hetzner.cloud/disable-public-network: "false"
    load-balancer.hetzner.cloud/ipv6-disabled: "false"
    load-balancer.hetzner.cloud/location: "ash"
    load-balancer.hetzner.cloud/type: "lb11"
    load-balancer.hetzner.cloud/uses-proxyprotocol: "true"
    load-balancer.hetzner.cloud/algorithm-type: "round_robin"
    load-balancer.hetzner.cloud/health-check-interval: "15s"
    load-balancer.hetzner.cloud/health-check-timeout: "10s"
    load-balancer.hetzner.cloud/health-check-retries: "3"
ports:
  web:
    redirections:
      entryPoint:
        to: websecure
        scheme: https
        permanent: true
    proxyProtocol:
      trustedIPs:
        - 127.0.0.1/32
        - 10.0.0.0/8
    forwardedHeaders:
      trustedIPs:
        - 127.0.0.1/32
        - 10.0.0.0/8
  websecure:
    proxyProtocol:
      trustedIPs:
        - 127.0.0.1/32
        - 10.0.0.0/8
    forwardedHeaders:
      trustedIPs:
        - 127.0.0.1/32
        - 10.0.0.0/8
  metrics:
    port: 9100
    exposedPort: 9100
podDisruptionBudget:
  enabled: true
  maxUnavailable: 33%
additionalArguments:
  - "--providers.kubernetesingress.ingressendpoint.publishedservice=traefik/traefik"
  - "--accesslog.fields.headers.defaultmode=keep"
  - "--accesslog=true"
  - "--accesslog.format=json"
  - "--log.level=INFO"
resources:
  requests:
    cpu: "100m"
    memory: "50Mi"
  limits:
    cpu: "300m"
    memory: "150Mi"
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
metrics:
  prometheus:
    entryPoint: metrics
    addEntryPointsLabels: true
    addRoutersLabels: true
    addServicesLabels: true
EOT
```

Once Grafana was properly receiving everything it needed, I used KH Assistant to generate dashboards with the data I wanted to visualize.

And so far things look good! I can manage the entire cluster using Terraform, and all deployments on the cluster with Flux. Everything is managed through a single Git repo I can modify from anywhere. And I have visibility into the cluster's health and performance. Life is good!

One of the things I am still trying to decide on is my preferred method for handling secrets. While I could just apply them with `kubectl`, I'm trying to avoid any manual intervention. Some methods I'm considering are [Hashicorp Vault](https://external-secrets.io/latest/provider/hashicorp-vault/) and [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets). If you have any recommendations, please let me know!
