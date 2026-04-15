---
title: Kubernetes
description: Diving into the world of k8s once again
date: 2023-10-07
tags: ["k8s","infra"]
---

I've wanted to learn more about Terraform and Kubernetes for some time now, and I've made a couple half hearted attempts to set something up, but none of them thus far had resulted in a useable cluster. But I found myself with some time recently and decided I'd give it another shot. I've also found myself extra frustrated recently with dealing with cloud providers like Azure, having to click through so many menus and settings panes to configure everything and so this gave me a bit of extra motivation.

I wanted to try standing up my own cluster, versus just using GKE, AKS or similar. But I also didn't want to do it all by hand just yet. So I opted to use a Terraform module. There is a great project for one of my favorite cloud providers, [Hetzner](https://www.hetzner.com/). You can find the project repo [here](https://github.com/kube-hetzner/terraform-hcloud-kube-hetzner).

This worked great, I was able to get the cluster up and running quickly. The next step was to actually deploy some containers. After talking to a friend with extensive Kubernetes experience I decided to try [Flux](https://fluxcd.io). This would be the first step in my downfall!

I was working through their getting started guide and got to this step, where we bootstrap the Flux install and repository.

```sh
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/my-cluster \
  --personal
```

I misunderstood this path variable, and I didn't realize this would be a path within the repository that would be created. And of course I didn't have a `/clusters` directory! So I gave it a relative path within the directory with my cluster configs. This was something like `~/dev/infra/cluster`. And so this was created, in my current directory.

But Flux would not reconcile. And I could not figure out why. I was going back and forth with my friend, trying to figure out the problem. At one point I realized, this path should not have been a relative path. So perhaps I will re-run the bootstrap command with an appropriate argument. And so, despite many jokes and trolls on IRC and around the internet my distracted brain went to delete the directory created by the first bootstrap, with

`rm -rf ~`

Ah yes, it made perfect sense at the time. This was the directory I needed to remove. This was the command to remove it. Immediately I recognized my mistake as I saw hundreds of lines scrolling by, my home directory vanishing quickly. Luckily my Go pkg directory is apparently huge, and I was able to cancel before too much damage was done.

After I sulked a bit and my ego recovered, I remembered that I had actually set up Time Machine on my NAS and could recover all my files. I was so relieved. Please back up your files :). I was then able to properly remove the offending directory which, ironically, had not been impacted.

However Flux was still not working. I could not clone from my repo. SSH would not connect. So we tried `ssh.github.com` over port 443, and that worked fine. I went through a dance of updating Flux's secret which contained its known_hosts value to support this new hostname, reconciling, restarting the source-controller, forgetting to update another yaml, or committing the repo, or some other silly thing. But finally, it all clicked, and it worked. Flux reconciled, and everything was peachy.

In retrospect, it should have been obvious, but I was used to Hetzner servers not having any firewalls when they are first created. But when this project creates its servers it adds a rule blocking outbound connections on port 22 which prevented the Flux repository from cloning. If I had removed this I would not have needed to update Flux's known_hosts.

So while slightly traumatizing, it was a great learning experience, and now I have a shiny new cluster to continue learning with. And I'm looking forward to migrating my services to this cluster, carefully.