# venatio.dev

Personal site and blog built with [Hugo](https://gohugo.io/) using the [hugo-blog-awesome](https://github.com/hugo-sid/hugo-blog-awesome) theme (v1.21.0) via Hugo Modules.

**Site:** https://venatio.dev/

## Quick Start

```bash
hugo server        # Dev server with live reload
hugo server -D     # Include drafts
hugo               # Build to /public
hugo --minify      # Production build
```

Requires Hugo **extended** version and Go 1.23.5+.

## Content

### Creating Posts

```bash
hugo new posts/my-post-title.md
```

Posts use YAML front matter (`---`). Available fields:

```yaml
---
title: "Post Title"                # Required
description: "Short summary"       # Used for meta description and OG tags
date: 2026-04-15                   # Required
tags: ["tag1", "tag2"]             # Optional
draft: true                        # Optional, defaults to false
image: "/images/posts/my-post.png" # Optional, see Social Cards & Hero Images
bluesky: "https://bsky.app/..."    # Optional, see Comments
mastodon: "https://mastodon.social/..." # Optional, see Comments
commentsDemoMode: true             # Optional, see Comments
---
```

### Creating Pages

```bash
hugo new pages/my-page.md
```

## Social Cards & Hero Images

Posts generate Open Graph and Twitter Card meta tags for rich previews when shared on Bluesky, Mastodon, Twitter, LinkedIn, etc.

### How It Works

- A **site-wide default image** (`static/images/og-default.png`, 1200x630) is used for all pages and posts that don't specify their own image.
- The default is configured in `hugo.toml` as `ogimage` under `[Languages.en-us.params]`.
- When an image is available, `twitter:card` is set to `summary_large_image` (full-width preview). Without an image, it falls back to `summary` (small thumbnail).
- The theme's duplicate built-in OG/Twitter templates have been removed. All meta tags come from the theme's `meta/standard.html` partial plus our custom `layouts/partials/head.html`.

### Per-Post Images

Add `image` to a post's front matter to set a custom social card image:

```yaml
image: "/images/posts/kubernetes-part-two.png"
```

This does two things:
1. **Social card** -- The image is used as the `og:image` and `twitter:image` for link previews.
2. **Hero image** -- The same image is rendered at the top of the post page, above the title.

Place image files in `static/images/posts/`. Recommended size: **1200x630** pixels (standard OG card dimensions).

If no `image` is set, the site-wide default (`og-default.png`) is used for social cards, and no hero image is shown on the post.

### Replacing the Default Image

Replace `static/images/og-default.png` with your own 1200x630 image. The current placeholder uses the site's ocean wave palette and typography.

### Testing Social Cards

Use these tools to preview how cards will render without posting:

- **opengraph.xyz** -- Multi-platform preview (Twitter, Facebook, LinkedIn)
- **socialsharepreview.com** -- Similar multi-platform preview
- **Twitter Card Validator** -- cards-dev.twitter.com/validator
- **Facebook Sharing Debugger** -- developers.facebook.com/tools/debug/
- **Bluesky / Mastodon** -- Paste a link in the compose box to see the card preview without posting

These tools require a publicly accessible URL (they won't work with `localhost`).

## Comments

Posts can display comments sourced from Bluesky and/or Mastodon replies. Replies to a linked social media post are fetched client-side and rendered as comments on the blog post.

### Setup

1. Publish your blog post.
2. Share it on Bluesky and/or Mastodon.
3. Add the social media post URL(s) to your blog post's front matter:

```yaml
bluesky: "https://bsky.app/profile/yourhandle/post/3lbqta5lnck2i"
mastodon: "https://mastodon.social/@youruser/109774012599031406"
```

4. Rebuild and deploy the site.

You can use one or both sources. Comments from both are merged into a single chronological stream.

### Features

- **Merged stream** -- Bluesky and Mastodon comments are sorted together by timestamp.
- **Source icons** -- Each comment shows a small Bluesky or Mastodon icon to indicate its origin.
- **Threaded replies** -- Direct replies to comments are shown indented under their parent (one level deep).
- **Avatars** -- User profile pictures are displayed. When unavailable, a placeholder with the user's initial is shown.
- **Engagement counts** -- Likes and reposts/boosts are displayed on each comment.
- **Relative timestamps** -- "2h ago", "3d ago", etc., linking back to the original post.
- **No authentication required** -- Both APIs are fetched without tokens. Bluesky uses the public AppView (`public.api.bsky.app`), Mastodon uses the public status context API.
- **No backend** -- Everything is client-side JavaScript. No server-side proxy, no API keys, no costs.
- **Sanitized content** -- Mastodon HTML is sanitized (scripts, event handlers stripped). Bluesky plain text is escaped and linkified. All user-generated links have `rel="external nofollow noopener noreferrer"`.

### Demo Mode

To test comment rendering without live social media posts, add `commentsDemoMode: true` to a post's front matter:

```yaml
commentsDemoMode: true
```

This renders six placeholder comments (three from each source, including threaded replies) so you can verify styling and layout. Remove it before publishing.

### How It Works Internally

- `layouts/partials/comments.html` -- Conditionally renders the comments container when `bluesky`, `mastodon`, or `commentsDemoMode` is set. Includes noscript fallback and "Reply on..." call-to-action.
- `assets/js/comments.js` -- Fetches from both APIs in parallel, normalizes responses into a unified format, and renders the merged stream. Only loaded on pages that have comments enabled.
- Styles are in `assets/sass/_custom.scss` under the `// -- comments` section.

### Limitations

- **Chicken-and-egg workflow** -- You must publish the blog post, create the social media post, then update the front matter with the URL and redeploy.
- **Bluesky** -- The public AppView has a short cache; new replies may take a few minutes to appear.
- **Mastodon federation** -- Only replies known to the queried instance are shown. Replies from disconnected instances may not appear.
- **No real-time updates** -- Comments load on page load. Visitors must refresh for new replies.

## Project Structure

```
├── archetypes/              # Content templates for `hugo new`
├── assets/
│   ├── js/
│   │   ├── comments.js      # Social comments JS
│   │   └── theme.js         # Theme overrides
│   └── sass/
│       └── _custom.scss     # All custom styles
├── content/
│   ├── pages/               # Static pages (about.md)
│   └── posts/               # Blog posts
├── layouts/
│   ├── _default/
│   │   ├── list.html        # Post listing page
│   │   └── single.html      # Individual post page
│   ├── _partials/
│   │   ├── header.html      # Site header/nav
│   │   ├── svgs/            # SVG icon partials
│   │   └── wave-background.html  # WebGL background animations
│   ├── partials/
│   │   ├── bio.html         # Author bio (theme override)
│   │   ├── comments.html    # Social comments partial
│   │   └── head.html        # <head> override (OG/Twitter tags)
│   ├── baseof.html          # Base layout
│   ├── home.html            # Homepage
│   └── rss.xml              # Custom RSS feed
├── static/
│   ├── images/
│   │   └── og-default.png   # Default social card image (1200x630)
│   └── pfp.jpg              # Profile photo
├── go.mod                   # Go module definition
├── hugo.toml                # Site configuration
└── AGENTS.md                # Agentic coding guidelines
```

## Theme Customization

The site uses hugo-blog-awesome as a base theme via Hugo Modules. Customizations are applied by overriding theme files in `layouts/`:

- `layouts/partials/head.html` -- Overrides the theme's `<head>` to remove duplicate OG/Twitter meta tags and add `summary_large_image` card type.
- `layouts/partials/bio.html` -- Custom author bio.
- `layouts/baseof.html` -- Custom base layout with glass-panel design, wave background integration, and custom nav/footer.
- `layouts/_default/single.html` -- Custom post template with hero images and comments.

All custom styles live in `assets/sass/_custom.scss`. The theme's default styles are largely overridden to implement a dark, monospace, glass-panel aesthetic.

### Updating the Theme

```bash
hugo mod get -u github.com/hugo-sid/hugo-blog-awesome
hugo mod tidy
```

After updating, check that overridden partials (especially `head.html`) are still compatible with the new theme version.

:) :)
