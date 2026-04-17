+++
date = '2026-04-17T03:08:36-04:00'
draft = false
title = 'k8s to Docker Migration'
image = 'images/tf-docker.png'
+++

## The Situation
I decided some time ago that I wanted to learn more about Kubernetes, and the best way was to dive right into the deep end. I migrated my minimal set of personal infrastructure over and started the uphill slog that was the k8s learning curve. With infrastructure deployed via [Terraform](https://developer.hashicorp.com/terraform) and services handled by [FluxCD](https://fluxcd.io/) I fell in love with the Gitops workflow and how easy it was to manage. But when something went wrong, it became a huge headache to track down the cause.
## The Problem

The major issue, I believe, has been an ongoing resource exhaustion or memory leak that manifests every few weeks. This also impacts the cluster in what seems to be strange ways. For instance, the last couple times it started happening my SSH connection into my Weechat container would start lagging badly and eventually drop completely, leaving me unable to reconnect. Several nodes would report high memory usage, but only the control plane node would actually be over resource limits. An issue like this with the control plane should not impact my SSH connection to Weechat. Then, restarting the control plane node would resolve things, for a while.

```bash
NAME                      CPU(cores) CPU(%) MEMORY(bytes) MEMORY(%)
k3s-agent-mid-rnj         258m       9%     2355Mi        73%
k3s-agent-small-jiz       33m        1%     701Mi         53%
k3s-agent-small-vlb       36m        2%     844Mi         63%
k3s-control-plane-ash-oht 119m       4%     2233Mi        110%
k3s-egress-ufi            13m        0%     674Mi         51%
```

Eventually I installed observability tools on the cluster and stored them on a volume so they would persist through these events. However I would discover that the collection failed when these hit, and I would just be left with gaps in my metrics and no details to go on. My remediation remained just restarting my nodes manually when this happened and continuing to scratch my head. Slightly demoralizing!

The cluster ran fine on the available hardware when it was fresh, but eventually it would come crashing down after running long enough. I think it may have been multiple issues interacting in a way that eventually lead to this, because even the high memory usage services didn't seem like they should be able to freeze up the entire cluster like this.

And on top of this all, the cluster was expensive. For the relatively small collection of services I was running, the overhead required to run the cluster was a huge percentage of compute requirements and price. **The cluster required three CPX11 servers (€4.49/mo each), two CPX21 servers (€8.99/mo each), a load balancer (€5.39/mo), several volumes (€5.28/mo total) and other misc resources for just 2-4 small services**. Also Hetzner is running short on US VPS stock, so it was becoming more difficult to spin up low latency machines as needed.

## The Solution
I dealt with this issue longer than I should have because I'm a huge fan of the Gitops workflow of Kubernetes and I didn't want to let it go. But eventually the frustration built up so I started looking into what my options were. Nothing fit quite like I wanted it to, I didn't want to manage the details of multiple servers manually. While researching alternatives, I discovered that there is actually a Github provider for Terraform. And so I could spin up servers as usual with Terraform and then use this provider to write metadata about the servers (IP, credentials) to the repo, and those could be used in the deployment scripts. This was the missing piece that would let me abstract away the details of server management.

I set up my Terraform config as normal, using their cloud backend for running plans and storing state. I set up my servers with a Cloud-init script to install Docker and login to the Github Container Repository (ghcr.io).

```hcl
# ── Cloud-init: bootstrap Docker + authorized keys ──────────────────
locals {
  docker_cloud_init = <<-CLOUDINIT
    #cloud-config
    package_update: true
    packages:
      - ca-certificates
      - curl
      - gnupg

    runcmd:
      # Install Docker via official script
      - curl -fsSL https://get.docker.com | sh
      - systemctl enable docker
      - systemctl start docker

      # Install docker-compose plugin
      - mkdir -p /usr/local/lib/docker/cli-plugins
      - curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" -o /usr/local/lib/docker/cli-plugins/docker-compose
      - chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

      # Log in to GHCR (token written by write_files)
      - docker login ghcr.io -u ${var.github_owner} --password-stdin < /root/.ghcr-token
      - rm -f /root/.ghcr-token

    write_files:
      - path: /root/.ghcr-token
        permissions: '0600'
        content: "${var.github_token}"
  CLOUDINIT
}
```

And then the other important part makes use of the Github provider. This will write the IP address of the deployed VPS to the repo as a variable. A small detail, but this lets me reference the variable in my deploy scripts rather than having to manually copy over an IP address once the server starts or gets recreated.

```hcl
resource "github_actions_variable" "weechat_host" {
  repository    = var.github_repo
  variable_name = "WEECHAT_HOST"
  value         = digitalocean_droplet.weechat.ipv4_address
}
```

The important part in the Github action will then read this variable while deploying services.

```yaml
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create service directory
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ vars.WEECHAT_HOST }}
          username: root
          key: ${{ secrets.DEPLOY_SSH_PRIVATE_KEY }}
          script: |
            mkdir -p /opt/services/weechat         
```

And all together this gives me a very similar experience to Kubernetes deployments but with a much simpler setup and far less resources required! **I've gone from using five VPSes and a load balancer to two $4/mo VPSes**. A huge chunk of these were required just to run Kubernetes itself.

## The Observability

Another great part of this setup is that I can use basically the same monitoring stack as I was using on Kubernetes. Grafana, Prometheus, and Loki. But instead of Promtail for aggregating logs, I'm using Grafana Alloy which handles logs for all my containers and also replaces Node Exporter for handling host metrics. 

```
┌─────────────────────────┐     ┌─────────────────────────┐
│     weechat droplet     │     │     searxng droplet     │
│                         │     │                         │
│  ┌───────────────────┐  │     │  ┌───────────────────┐  │
│  │ weechat container │  │     │  │ searxng container │  │
│  └───────────────────┘  │     │  └───────────────────┘  │
│  ┌───────────────────┐  │     │  ┌───────────────────┐  │
│  │  grafana alloy    │──┼──┐  │  │  grafana alloy    │──┼──┐
│  └───────────────────┘  │  │  │  └───────────────────┘  │  │
│  tailscale (host)       │  │  │  tailscale (host)       │  │
└─────────────────────────┘  │  └─────────────────────────┘  │
                             │                               │
                         tailnet                          tailnet
                             │                               │
                             ▼                               ▼
                   ┌─────────────────────────────────────────────┐
                   │         monitoring droplet                  │
                   │                                             │
                   │  ┌────────────┐ ┌────────┐ ┌────────────┐   │
                   │  │  Grafana   │ │ Prom   │ │   Loki     │   │
                   │  │  :3000     │ │ :9090  │ │   :3100    │   │
                   │  └────────────┘ └────────┘ └────────────┘   │
                   │  ┌────────────────────────────────────────┐ │
                   │  │  grafana alloy (monitors itself too)   │ │
                   │  └────────────────────────────────────────┘ │
                   │  tailscale (host)                           │
                   └───────────────────────────────────────────-─┘
                             ▲
                             │ tailnet (port 3000 only)
                             │
                   ┌─────────────────────┐
                   │  workstation        │
                   │  (existing tailnet  │
                   │   member)           │
                   └─────────────────────┘
```

And this is how I'll be hosting most of my services moving forward. Hopefully things will be more stable with this setup and still give me the convenience of clean, declarative Gitops. I can see the benefit of Kubernetes for larger orchestrated workflows, but it just became too much to manage for my personal stuff. 

Thanks for reading, and if you have any questions about any of this, feel free to reach out.
