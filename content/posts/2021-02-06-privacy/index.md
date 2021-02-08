---
title: Internet Privacy
date: 2021-02-07
tags: ["privacy","vpn","firefox"]
---

Nowadays it is more important than ever to protect your data. I think a lot of people know they could be better about this but haven't taken the time to learn how to do it properly. Luckily, I'm a huge nerd, and I've taken this time for you! Here I will describe my personal strategy for keeping my data safe online, and hopefully you will find this useful in keeping yourself safe.

I'm going to cover three main topics:
- VPN
- Passwords
- Browser

## VPN

Whenever you connect to a website or any internet service, that service becomes aware of your [IP Address](https://en.wikipedia.org/wiki/IP_address). The service needs to know your IP address to know where to send data back to. If you're using a residential internet connection, this IP address is directly associated with your account. This allows government entities to request your information from your ISP. Your ISP could also potentially sell your browsing data to advertisers. ISPs have also been known to inject their own code into pages.

By using a shared VPN, the IP address the services receive cannot be directly linked back to you. A VPN also provides a layer of encryption which prevents your ISP from reading any of your data. Now when using a VPN service, you are essentially moving your trust from your ISP to the VPN service. However, VPN services are often rated according to their trustworthiness and they have a reputation to maintain versus an ISP that sells data as part of its standard business model. So it is important to use a VPN that is known to be trustworthy.

I like to use [Mullvad](https://mullvad.net) as a VPN. Mullvad uses the WireGuard protocol which is popular these days for being secure and performant. Mullvad offers their own application for every major operating system (including iOS and Android). You can also integrate their service with your existing OpenVPN or WireGuard setup. Mullvad costs €5 ($6.06) a month, which is a pretty good deal.

Mullvad does not collect any personal information beyond what is required for payment, and offers flexible payment offers including Bitcoin to retain your anonymity. They don't require an email. They also have a good reputation within the information security community.

By default the Mullvad app will route all your internet traffic through the VPN. But they also have a SOCKS5 proxy on their network which allows you to utilize an individual application's settings to route its traffic through the VPN. 

<div align="center">
{{< figure src="mullvad-payments.png" width="500" caption="Mullvad VPN payment options" >}} 
</div>

You can also set up your own VPN pretty easily, however the real benefit from these VPN services comes from the fact that they are shared, and the IP address they provide you cannot be directly linked back to you. Setting up your own VPN will still give you a layer of encryption between you and your ISP, but the host you use to run the VPN would still be aware of your identity.

The easiest option is to simply use the Mullvad app to manage your VPN connection. The app runs out of the system tray in Windows and is pretty simple and straight forward to use. It is also available for mobile devices and looks exactly the same. It also allows you to select a geographic location for you to exit their network, so services you access think you're coming from a different country. This can be useful to get around geo-blocks and access different streaming services, among other things.

<div align="center">
{{< figure src="mullvad-app.png" width="300" caption="Mullvad app" >}} 
</div>

Mullvad also provides OpenVPN and Wireguard config files for you to download if you want to use those clients as well. I opted to integrate Mullvad into my existing Wireguard configuration, which required me to set a registry key in Windows to enable multiple tunnels. You must set `HKLM\Software\WireGuard\MultipleSimultaneousTunnels` to `DWORD(1)` for this.

Another option is [TOR](https://www.torproject.org/), or The Onion Router, a project I love. However anyone can run a TOR node and there are people out there who set up malicious nodes to sniff your traffic. If you're just getting started with internet privacy I wouldn't recommend TOR as your first step.

## Passwords

Using [KeePassXC](https://keepassxc.org/download/) is a great way to manage your passwords. There is also a [Firefox addon](https://addons.mozilla.org/en-US/firefox/addon/keepassxc-browser/) that enables filling in login forms easily with your saved credentials. You should back up the database somewhere safe. On Android, I use [Keepass2Android](https://play.google.com/store/apps/details?id=keepass2android.keepass2android) to access my database. You can also go into Android's settings to set this as your default password service which will enable you to automatically save and enter passwords the same way Google's feature works. I also use Google Drive to sync my database across devices, but these apps support pretty much any cloud storage service.

You can also set expirations for your passwords to remind you to update them every few months, which is a really good idea. I like to update my passwords every 3 months or so. KeePassXC includes a password generator which makes it easy to generate a secure password. And if you have KeePassXC set up on all your devices, its super easy to log back into all of your services after you update.

You should be using a different password for every service you use, and with a setup like this that makes it easy to manage, there's no excuse not to!

<div align="center">
{{< figure src="keepassxc.png" width="650" caption="KeePassXC UI" >}} 
</div>

## Browser

Here I will cover several browser plugins that will help keep you safe. Chrome is currently the most popular browser out there, and while it is a good piece of software, most people employ these privacy techniques to avoid advertisers and Google is one of the biggest advertising companies in the world. It would make sense to avoid supporting them if you're trying to avoid their business practices. Mozilla supports open standards and contributes to the developer community. Thus, I recommend using Firefox.

My browser setup is a bit more complicated because I use multi-account containers, and I have some containers set up to not route through the VPN. To achieve this, I use the Container proxy addon. However, this has resulted in DNS leaks from extensions such as uBlock Origin and IPFS Companion. The easy way to handle this is to set the proxy settings directly in Firefox's network settings, however this won't allow you to have non-VPN containers. Or of course you could have your VPN application just route ALL of your system traffic through the VPN. This is probably fine for the majority of people, and is easier to manage. I will describe my setup below because I find it useful to have a container that bypasses the proxy.

#### Containers

<div align="center">
{{< figure src="containers.png" width="300" caption="Multi-account containers UI" >}} 
</div>

One of the best addons available for Firefox is the [Multi-account Containers addon](https://addons.mozilla.org/en-US/firefox/addon/multi-account-containers/). This lets you create containers for different tabs which isolate cookies and other storage methods from each other. You can use this to log into different accounts from the same service (such as multiple Twitter accounts) or to isolate your tabs for certain services. I have tabs set up for Facebook, Twitter, various Google services (Gmail, Youtube, Drive).

I also make use of the [Container proxy addon](https://addons.mozilla.org/en-US/firefox/addon/container-proxy/) in conjunction with Mullvad's SOCKS5 proxy. Most of my containers, including the default container, are routed through Mullvad. But I also have a few containers connect without the VPN for sites that don't allow VPN connections.

I do this because I don't route all of my traffic through the VPN by default. You can configure the Mullvad app or Wireguard to just route everything through the VPN, but if you need to use something that doesn't allow VPNs you need to disable it.

#### Scripts

<div align="center">
{{< figure src="noscript.png" width="600" caption="NoScript UI" >}} 
</div>

Disabling Javascript on sites you don't trust is probably the best single thing you can do to protect yourself. Javascript can do a lot these days, and enables a lot of fingerprinting techniques that can be used to identify you. I use [NoScript](https://addons.mozilla.org/en-US/firefox/addon/noscript/) to control this easily. You can temporarily enable Javascript (JS) for sites you want to use, or you can whitelist sites you use a lot so they will always have Javascript enabled.

I used to love using the [uMatrix](https://addons.mozilla.org/en-US/firefox/addon/umatrix/) addon to handle JS and other permissions but this addon is unfortunately no longer maintained. Although it does still work, so you could still use it. It provides a great UI for managing permissions for all domains that may be requested on a page.

<div align="center">
{{< figure src="ublock-origin.png" width="500" caption="uBlock Origin UI" >}} 
</div>

[uBlock Origin](https://ublockorigin.com/) is a great ad blocker that is simple to use. It comes with some default lists you can use to block advertiser domains and you can also add your own. 

I did run into an issue with DNS leaks with my container setup. uBlock Origin was not respecting my proxy settings from Container proxy. This is not an issue if you set the proxy settings in Firefox's network settings, but doing that prevents creating containers that bypass the VPN. Instead I opted to disable the CNAME uncloak feature of uBlock, which is what generates the leaking DNS queries. You can do this by going into the advanced settings of uBlock and setting `cnameUncloak false`.

CNAME cloaking can be used by advertisers to make their scripts and cookies appear as first party, as opposed to third party. This means advertisers' scripts could appear to be coming directly from the page you're loading. uBlock fights this but doing an extra DNS request to check every requested host on a page for CNAME cloaks. However, if you employ all the other methods described here, you will still be safe from tracking.

Checking for DNS leaks is important. One of the best leak testers I've found is [Browserleaks.com](https://browserleaks.com/dns). This site also includes other types of privacy checks.

#### Cookies

<div align="center">
{{< figure src="cookieautodelete.png" width="500" caption="Cookie AutoDelete UI" >}} 
</div>

Cookies are small files on your computer that websites use to store data locally. They are often used to store your session identifier which enables you to stay logged into a website across multiple visits. However cookies can be used to track you as well. Containers already isolate their cookies, so pages loaded in other containers or without a container won't be able to read those cookies. I also like to use [Cookie AutoDelete](https://addons.mozilla.org/en-US/firefox/addon/cookie-autodelete/) which allows you to whitelist allowed cookies, and everything else will be deleted. There is an additional setting that needs to be set to allow it to operate within containers.

<div align="center">
{{< figure src="cad-settings.png" width="500" caption="Container settings for Cookie AutoDelete" >}} 
</div>

## Thanks!

I hope you found this useful. I'm always looking to improve my approach to privacy, if you have any suggestions or ideas for improvement, please contact me on Twitter [@VenatioDecorus](https://twitter.com/venatiodecorus).